// src/game/Game.ts

import { WebSocket } from 'ws';
import palavrasData from './palavras_jogo.json';
import { pool } from '../db';

// Tipos (sem alterações)
type PlayerRole = 'spymaster' | 'operative';
type Team = 'A' | 'B';
type GamePhase = 'waiting' | 'giving_clue' | 'guessing' | 'ended';

interface Player {
    id: string;
    ws: WebSocket;
    username: string;
    team?: Team;
    role?: PlayerRole;
}

interface Card {
    word: string;
    color: 'blue' | 'red' | 'neutral' | 'assassin';
    revealed: boolean;
}

interface WsMessage {
    type: string;
    payload: any;
}

// Função auxiliar (sem alterações)
async function updateLobbyStatus(lobbyCode: string, status: 'waiting' | 'in_game' | 'finished'): Promise<void> {
    try {
        let query = '';
        if (status === 'finished') {
            query = 'UPDATE lobbys SET status = $1, finished_at = NOW(), last_activity_at = NOW() WHERE code_lobby = $2';
        } else {
            query = 'UPDATE lobbys SET status = $1, last_activity_at = NOW() WHERE code_lobby = $2';
        }
        await pool.query(query, [status, lobbyCode]);
        console.log(`[DB] Status do lobby ${lobbyCode} atualizado para: ${status}`);
    } catch (error) {
        console.error(`[DB] Falha ao atualizar status do lobby ${lobbyCode}:`, error);
    }
}


export class Game {
    private lobbyId: string;
    private creatorId: number;
    private readonly MAX_PLAYERS = 16;
    private players: Map<WebSocket, Player>;
    private board: Card[] = [];
    private currentTurn: Team = 'A';
    private gamePhase: GamePhase = 'waiting';
    private currentClue: { word: string; count: number } | null = null;
    private guessesRemaining: number = 0;
    private scores = { A: 0, B: 0 };
    private winner: Team | null = null;
    private log: string[] = ["Aguardando jogadores..."];
    private creatorDisconnectTimeout: NodeJS.Timeout | null = null;

    constructor(lobbyId: string, creatorId: number) {
        this.lobbyId = lobbyId;
        this.creatorId = creatorId;
        this.players = new Map();
    }

    addPlayer(ws: WebSocket) {
        console.log(`[Game] Conexão WebSocket estabelecida para o lobby ${this.lobbyId}. Aguardando JOIN_GAME.`);
    }

    removePlayer(ws: WebSocket) {
        const player = this.players.get(ws);
        if (player) {
            this.players.delete(ws);
            this.log.push(`🚪 ${player.username} saiu da sala.`);
            console.log(`[Game] Jogador ${player.username} desconectado do lobby ${this.lobbyId}`);

            if (Number(player.id) === this.creatorId) {
                this.log.push(`🚨 O criador da sala desconectou! A sala será fechada em 30 segundos se ele não retornar.`);
                
                // MUDANÇA 1: Enviar uma mensagem de aviso específica para o frontend
                this.broadcastMessage({
                    type: 'CREATOR_DISCONNECTED_WARNING',
                    payload: { message: 'O criador desconectou! A sala será fechada em 30s se ele não retornar.' }
                });

                this.broadcastState(); // Atualiza o log para quem está com a tela aberta

                console.log(`[Game] Criador (${this.creatorId}) desconectou. Iniciando contagem de 30s para fechar o lobby ${this.lobbyId}.`);
                
                this.creatorDisconnectTimeout = setTimeout(() => {
                    console.log(`[Game] Janela de tolerância para o criador do lobby ${this.lobbyId} expirou. Fechando a sala.`);
                    this.log.push(`🚨 O criador não retornou a tempo. O jogo foi encerrado.`);
                    
                    this.broadcastMessage({
                        type: 'LOBBY_CLOSED',
                        payload: { reason: 'O criador da sala saiu e não retornou.' }
                    });

                    this.players.forEach((p, clientWs) => {
                        clientWs.close(1000, 'O criador encerrou a sala.');
                    });

                    this.players.clear();
                    updateLobbyStatus(this.lobbyId, 'finished');
                }, 30000);

            } else {
                this.broadcastState();
            }
        }
    }

    isEmpty(): boolean {
        return this.players.size === 0;
    }

    handleMessage(ws: WebSocket, messageStr: string) {
        try {
            const message: WsMessage = JSON.parse(messageStr);
            
            if (message.type === 'JOIN_GAME') {
                const { userId, username } = message.payload;
                
                if (Number(userId) === this.creatorId && this.creatorDisconnectTimeout) {
                    console.log(`[Game] Criador (${this.creatorId}) reconectou-se a tempo! Cancelando fechamento do lobby ${this.lobbyId}.`);
                    clearTimeout(this.creatorDisconnectTimeout);
                    this.creatorDisconnectTimeout = null;
                    this.log.push(`✅ O criador da sala retornou!`);

                    // MUDANÇA 2: Enviar uma mensagem de sucesso quando o criador se reconecta
                    this.broadcastMessage({
                        type: 'CREATOR_RECONNECTED',
                        payload: { message: 'O criador da sala retornou! O jogo continua.' }
                    });
                }

                // Lógica de reconexão continua a mesma
                let existingPlayer: Player | undefined;
                let oldWs: WebSocket | undefined;
                for (const [clientWs, player] of this.players.entries()) {
                    if (player.id === userId) {
                        existingPlayer = player;
                        oldWs = clientWs;
                        break;
                    }
                }

                if (existingPlayer && oldWs) {
                    console.log(`[Game] Jogador ${username} (${userId}) está se reconectando ao lobby ${this.lobbyId}.`);
                    this.players.delete(oldWs);
                    existingPlayer.ws = ws;
                    this.players.set(ws, existingPlayer);
                    this.log.push(`🔌 ${username} reconectou-se à sala.`);
                } else {
                    if (this.players.size >= this.MAX_PLAYERS) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'A sala está cheia.' } }));
                        ws.close(1008, 'Sala cheia');
                        return;
                    }
                    const newPlayer: Player = { id: userId, username: username, ws: ws };
                    this.players.set(ws, newPlayer);
                    this.log.push(`👋 ${newPlayer.username} entrou na sala!`);
                    console.log(`[Game] Jogador ${newPlayer.username} (${newPlayer.id}) entrou no lobby ${this.lobbyId}.`);
                }
                
                this.broadcastState();
                return;
            }

            const player = this.players.get(ws);
            if (!player) {
                ws.close(1008, "Ação inválida antes de entrar no jogo.");
                return;
            }

            switch (message.type) {
                case 'START_GAME':
                    this.startGame();
                    break;
                case 'JOIN_TEAM':
                    this.joinTeam(player, message.payload.team, message.payload.role);
                    break;
                case 'GIVE_CLUE':
                    this.giveClue(player, message.payload.clue, message.payload.count);
                    break;
                case 'MAKE_GUESS':
                    this.makeGuess(player, message.payload.word);
                    break;
                default:
                    console.log(`[Game] Mensagem de tipo desconhecido recebida: ${message.type}`);
                    break;
            }
        } catch (error) {
            console.error('[Game] Erro ao processar mensagem WebSocket:', error);
        }
    }
    
    private async startGame() {
        if (this.gamePhase !== 'waiting' || this.players.size < 4) {
            this.broadcastMessage({ type: 'ERROR', payload: { message: 'São necessários pelo menos 4 jogadores para iniciar.' } });
            return;
        }

        await updateLobbyStatus(this.lobbyId, 'in_game');
        this.log = ["🚀 Jogo iniciado!"];
        const totalCards = 25;
        const words = this.shuffleArray(palavrasData.palavras).slice(0, totalCards);
        const colors = this.shuffleArray([
            ...Array(9).fill('blue'),
            ...Array(8).fill('red'),
            ...Array(7).fill('neutral'),
            ...Array(1).fill('assassin'),
        ]);
        this.board = words.map((word, i) => ({ word, color: colors[i], revealed: false }));
        this.scores = { A: 9, B: 8 };
        this.currentTurn = 'A';
        this.gamePhase = 'giving_clue';
        this.log.push(`🔵 Time Azul começa. Aguardando dica do espião.`);
        console.log(`Jogo ${this.lobbyId} iniciado!`);
        this.broadcastState();
    }

    private joinTeam(player: Player, team: Team, role: PlayerRole) {
        player.team = team;
        player.role = role;
        const teamName = team === 'A' ? "Azul" : "Vermelho";
        const roleName = role === 'spymaster' ? "Espião Mestre" : "Agente";
        this.log.push(`${player.username} entrou no Time ${teamName} como ${roleName}.`);
        this.broadcastState();
    }
    
    private giveClue(player: Player, clue: string, count: number) {
        if (this.gamePhase !== 'giving_clue' || player.role !== 'spymaster' || player.team !== this.currentTurn) return;
        this.currentClue = { word: clue, count };
        this.guessesRemaining = count;
        this.gamePhase = 'guessing';
        const teamName = player.team === 'A' ? '🔵' : '🔴';
        this.log.push(`${teamName} Dica: "${clue}" (${count})`);
        this.broadcastState();
    }

    private makeGuess(player: Player, word: string) {
        if (this.gamePhase !== 'guessing' || player.role !== 'operative' || player.team !== this.currentTurn) return;
        const card = this.board.find(c => c.word === word && !c.revealed);
        if (!card) return;

        card.revealed = true;
        this.log.push(`${player.username} chutou: "${word}".`);

        switch(card.color) {
            case 'assassin':
                this.log.push(`💣 Era o Assassino! Fim de jogo.`);
                this.endGame(this.currentTurn === 'A' ? 'B' : 'A');
                break;
            case 'neutral':
                this.log.push(`- Neutro. Fim do turno.`);
                this.endTurn();
                break;
            case 'blue':
                this.scores.A--;
                this.log.push(`✅ Correto! Era uma carta Azul.`);
                if (this.currentTurn === 'A') {
                    this.guessesRemaining--;
                    if (this.guessesRemaining <= 0) this.endTurn();
                } else {
                    this.log.push(`- Ops! Era do outro time. Fim do turno.`);
                    this.endTurn();
                }
                break;
            case 'red':
                this.scores.B--;
                this.log.push(`✅ Correto! Era uma carta Vermelha.`);
                if (this.currentTurn === 'B') {
                    this.guessesRemaining--;
                    if (this.guessesRemaining <= 0) this.endTurn();
                } else {
                    this.log.push(`- Ops! Era do outro time. Fim do turno.`);
                    this.endTurn();
                }
                break;
        }
        
        if (this.winner) return;
        if (this.scores.A === 0) this.endGame('A');
        else if (this.scores.B === 0) this.endGame('B');
        else this.broadcastState();
    }

    private endTurn() {
        this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';
        this.gamePhase = 'giving_clue';
        this.currentClue = null;
        this.guessesRemaining = 0;
        const teamName = this.currentTurn === 'A' ? 'Azul' : 'Vermelho';
        this.log.push(`Turno passou para o Time ${teamName}.`);
        this.broadcastState();
    }

    private async endGame(winner: Team) {
        if (this.winner) return;
        await updateLobbyStatus(this.lobbyId, 'waiting');
        this.winner = winner;
        this.gamePhase = 'ended';
        this.board.forEach(c => c.revealed = true);
        const teamName = winner === 'A' ? "Azul" : "Vermelho";
        this.log.push(`🏆 O Time ${teamName} venceu!`);
        this.broadcastState();
    }

    private broadcastState() {
        this.players.forEach((player) => {
            this.sendStateToPlayer(player);
        });
    }
    
    private sendStateToPlayer(player: Player) {
        if (player.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const playersList = Array.from(this.players.values()).map(p => ({
            id: p.id,
            username: p.username,
            team: p.team,
            role: p.role,
        }));

        const boardForPlayer = this.board.map(card => ({
            word: card.word,
            revealed: card.revealed,
            color: (this.gamePhase === 'ended' || player.role === 'spymaster' || card.revealed) ? card.color : 'hidden',
        }));

        const stateForPlayer = {
            lobbyId: this.lobbyId,
            players: playersList,
            board: boardForPlayer,
            currentTurn: this.currentTurn,
            gamePhase: this.gamePhase,
            currentClue: this.currentClue,
            guessesRemaining: this.guessesRemaining,
            scores: this.scores,
            winner: this.winner,
            log: this.log,
            // MUDANÇA 3: Adicionar o ID do criador ao estado do jogo
            creatorId: String(this.creatorId),
        };

        const message: WsMessage = {
            type: 'GAME_STATE_UPDATE',
            payload: stateForPlayer
        };

        player.ws.send(JSON.stringify(message));
    }
    
    private shuffleArray(array: any[]) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    private broadcastMessage(message: WsMessage) {
        const messageStr = JSON.stringify(message);
        this.players.forEach((player, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
    }
}