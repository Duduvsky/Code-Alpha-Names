// src/game/Game.ts

import { WebSocket } from 'ws';
import palavrasData from './palavras_jogo.json';
import { pool } from '../db';

// Tipos
type PlayerRole = 'spymaster' | 'operative';
type Team = 'A' | 'B';
type GamePhase = 'waiting' | 'giving_clue' | 'guessing' | 'ended';

interface Player {
    id: string;
    ws: WebSocket | null; 
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

interface GameSettings {
    roundDuration: number;
    blackCards: number;
}


async function saveMatchHistory(
    lobbyIdDb: number,
    winningTeam: Team,
    players: Player[]
) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            "UPDATE lobbys SET status = 'finished', finished_at = NOW(), last_activity_at = NOW() WHERE id = $1",
            [lobbyIdDb]
        );

        const playerInsertQuery = `
            INSERT INTO users_lobbys (id_lobby, id_user, team, role, winner)
            VALUES ($1, $2, $3, $4, $5)
        `;

        for (const player of players) {
            if (player.team && player.role) {
                const teamNameInDb = player.team === 'A' ? 'blue' : 'red';
                const winningTeamInDb = winningTeam === 'A' ? 'blue' : 'red';
                const didPlayerWin = teamNameInDb === winningTeamInDb;

                await client.query(playerInsertQuery, [
                    lobbyIdDb, Number(player.id), teamNameInDb, player.role, didPlayerWin,
                ]);
            }
        }

        await client.query('COMMIT');
        console.log(`[DB] Histórico da partida para o lobby ID ${lobbyIdDb} salvo com sucesso.`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[DB] Erro ao salvar histórico da partida:', error);
    } finally {
        client.release();
    }
}

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
    private players: Map<string, Player>; 
    private board: Card[] = [];
    private currentTurn: Team = 'A';
    private gamePhase: GamePhase = 'waiting';
    private currentClue: { word: string; count: number } | null = null;
    private guessesRemaining: number = 0;
    private scores = { A: 0, B: 0 };
    private winner: Team | null = null;
    private log: string[] = ["Aguardando jogadores..."];
    private creatorDisconnectTimeout: NodeJS.Timeout | null = null;
    private lobbyIdDb: number | null = null;
    private settings: GameSettings;
    private turnTimer: NodeJS.Timeout | null = null;
    private turnTimeRemaining: number | null = null;

    constructor(lobbyId: string, creatorId: number, settings: GameSettings) {
        this.lobbyId = lobbyId;
        this.creatorId = creatorId;
        this.settings = settings;
        this.players = new Map();
        this.fetchLobbyDbId(); 
    }

    private async fetchLobbyDbId() {
        try {
            const result = await pool.query('SELECT id FROM lobbys WHERE code_lobby = $1', [this.lobbyId]);
            if (result.rows.length > 0) {
                this.lobbyIdDb = result.rows[0].id;
            } else {
                console.error(`[Game] Não foi possível encontrar o ID do DB para o lobby ${this.lobbyId}`);
            }
        } catch (error) {
            console.error(`[Game] Erro ao buscar ID do DB para o lobby ${this.lobbyId}:`, error);
        }
    }

    addPlayer(ws: WebSocket) {
        console.log(`[Game] Conexão WebSocket estabelecida para o lobby ${this.lobbyId}. Aguardando JOIN_GAME.`);
    }

    removePlayer(ws: WebSocket) {
        let disconnectedPlayerId: string | null = null;
        for (const [playerId, player] of this.players.entries()) {
            if (player.ws === ws) {
                disconnectedPlayerId = playerId;
                break;
            }
        }
        if (disconnectedPlayerId) {
            const player = this.players.get(disconnectedPlayerId)!;
            player.ws = null;
            this.log.push(`🔌 ${player.username} desconectou-se.`);
            console.log(`[Game] Jogador ${player.username} desconectado. Seu lugar está guardado.`);
            if (Number(player.id) === this.creatorId) {
                this.log.push(`🚨 O criador da sala desconectou! A sala será fechada em 30 segundos se ele não retornar.`);
                this.broadcastMessage({ type: 'CREATOR_DISCONNECTED_WARNING', payload: { message: 'O criador desconectou! A sala será fechada em 30s se ele não retornar.' } });
                this.clearTurnTimer();
                this.creatorDisconnectTimeout = setTimeout(() => {
                    this.log.push(`🚨 O criador não retornou a tempo. O jogo foi encerrado.`);
                    this.broadcastMessage({ type: 'LOBBY_CLOSED', payload: { reason: 'O criador da sala saiu e não retornou.' } });
                    this.players.forEach(p => p.ws?.close(1000, 'O criador encerrou a sala.'));
                    this.players.clear();
                    updateLobbyStatus(this.lobbyId, 'finished');
                }, 30000);
            }
            this.broadcastState();
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
                const existingPlayer = this.players.get(userId);

                if (existingPlayer) {
                    console.log(`[Game] Jogador ${username} (${userId}) está se reconectando.`);
                    existingPlayer.ws = ws;
                    this.log.push(`✅ ${username} reconectou-se à sala.`);
                    if (Number(userId) === this.creatorId && this.creatorDisconnectTimeout) {
                        clearTimeout(this.creatorDisconnectTimeout);
                        this.creatorDisconnectTimeout = null;
                        this.log.push(`👑 O criador da sala retornou!`);
                        if(this.gamePhase !== 'waiting' && this.gamePhase !== 'ended') {
                            this.startTurnTimer();
                        }
                        this.broadcastMessage({ type: 'CREATOR_RECONNECTED', payload: { message: 'O criador da sala retornou! O jogo continua.' } });
                    }
                } else {
                    // ===================================================================
                    // LÓGICA AJUSTADA PARA NOVOS JOGADORES
                    // ===================================================================
                    if (this.gamePhase !== 'waiting') {
                        console.log(`[Game] Bloqueando novo jogador (${username}) de entrar em jogo em andamento.`);
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Este jogo já começou. Você não pode entrar.' } }));
                        ws.close(1008, 'Game already in progress');
                        return;
                    }

                    if (this.players.size >= this.MAX_PLAYERS) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'A sala está cheia.' } }));
                        ws.close(1008, 'Sala cheia');
                        return;
                    }
                    const newPlayer: Player = { id: userId, username, ws, team: undefined, role: undefined };
                    this.players.set(userId, newPlayer);
                    this.log.push(`👋 ${newPlayer.username} entrou na sala!`);
                }
                
                this.broadcastState();
                return;
            }

            let sendingPlayer: Player | null = null;
            for(const player of this.players.values()){
                if(player.ws === ws){
                    sendingPlayer = player;
                    break;
                }
            }
            
            if (!sendingPlayer) {
                ws.close(1008, "Ação inválida antes de entrar no jogo.");
                return;
            }

            switch (message.type) {
                case 'START_GAME': this.startGame(); break;
                case 'JOIN_TEAM': this.joinTeam(sendingPlayer, message.payload.team, message.payload.role); break;
                case 'GIVE_CLUE': this.giveClue(sendingPlayer, message.payload.clue, message.payload.count); break;
                case 'MAKE_GUESS': this.makeGuess(sendingPlayer, message.payload.word); break;
                default: console.log(`[Game] Mensagem de tipo desconhecido recebida: ${message.type}`); break;
            }
        } catch (error) {
            console.error('[Game] Erro ao processar mensagem WebSocket:', error);
        }
    }
    
    private clearTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }

    private startTurnTimer() {
        this.clearTurnTimer();
        if (this.settings.roundDuration <= 0) {
            this.turnTimeRemaining = null;
            return;
        }
        this.turnTimeRemaining = this.turnTimeRemaining || this.settings.roundDuration;
        this.broadcastState();
        this.turnTimer = setInterval(() => {
            if (this.turnTimeRemaining !== null && this.turnTimeRemaining > 0) {
                this.turnTimeRemaining--;
                this.broadcastState();
            } else {
                this.log.push(`⌛ O tempo acabou! Turno encerrado.`);
                this.endTurn();
            }
        }, 1000);
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
        const numBlackCards = this.settings.blackCards;
        const numBlueCards = 9;
        const numRedCards = 8;
        const numNeutralCards = totalCards - numBlueCards - numRedCards - numBlackCards;
        if (numNeutralCards < 0) {
            console.error(`[Game] Configuração de cartas inválida. Fallback para modo Normal.`);
            const fallbackColors = this.shuffleArray([...Array(9).fill('blue'),...Array(8).fill('red'),...Array(7).fill('neutral'),...Array(1).fill('assassin')]);
            this.board = words.map((word, i) => ({ word, color: fallbackColors[i], revealed: false }));
            this.scores = { A: 9, B: 8 };
        } else {
             const colors = this.shuffleArray([...Array(numBlueCards).fill('blue'),...Array(numRedCards).fill('red'),...Array(numNeutralCards).fill('neutral'),...Array(numBlackCards).fill('assassin')]);
            this.board = words.map((word, i) => ({ word, color: colors[i], revealed: false }));
            this.scores = { A: numBlueCards, B: numRedCards };
        }
        this.currentTurn = 'A';
        this.gamePhase = 'giving_clue';
        this.log.push(`🔵 Time Azul começa. Aguardando dica do espião.`);
        console.log(`[Game] Jogo ${this.lobbyId} iniciado com ${numBlackCards} carta(s) de assassino!`);
        this.startTurnTimer();
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
        this.turnTimeRemaining = null;
        this.currentClue = { word: clue, count };
        this.guessesRemaining = count;
        this.gamePhase = 'guessing';
        const teamName = player.team === 'A' ? '🔵' : '🔴';
        this.log.push(`${teamName} Dica: "${clue}" (${count})`);
        this.startTurnTimer();
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
        this.turnTimeRemaining = null;
        this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';
        this.gamePhase = 'giving_clue';
        this.currentClue = null;
        this.guessesRemaining = 0;
        const teamName = this.currentTurn === 'A' ? 'Azul' : 'Vermelho';
        this.log.push(`Turno passou para o Time ${teamName}.`);
        this.startTurnTimer();
    }
    
    private async endGame(winner: Team) {
        if (this.winner) return;
        this.clearTurnTimer();
        this.winner = winner;
        this.gamePhase = 'ended';
        this.board.forEach(c => c.revealed = true);
        const teamName = winner === 'A' ? "Azul" : "Vermelho";
        this.log.push(`🏆 O Time ${teamName} venceu!`);
        if (this.lobbyIdDb) {
            const playersArray = Array.from(this.players.values());
            await saveMatchHistory(this.lobbyIdDb, winner, playersArray);
        } else {
            console.error(`[Game] Não foi possível salvar o histórico. ID do lobby no DB não foi encontrado para o código ${this.lobbyId}.`);
            await updateLobbyStatus(this.lobbyId, 'finished');
        }
        this.broadcastState();
    }

    private broadcastState() {
        this.players.forEach((player) => {
            this.sendStateToPlayer(player);
        });
    }
    
    private sendStateToPlayer(player: Player) {
        if (!player.ws || player.ws.readyState !== WebSocket.OPEN) {
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
            creatorId: String(this.creatorId),
            turnTimeRemaining: this.turnTimeRemaining,
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
        this.players.forEach((player) => {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(messageStr);
            }
        });
    }
}