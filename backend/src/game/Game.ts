// src/game/Game.ts
import { WebSocket } from 'ws';
import palavrasData from './palavras_jogo.json'; // Certifique-se que o path e o nome estão corretos

// Tipos
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

export class Game {
    private lobbyId: string;
    private players: Map<WebSocket, Player>;
    private board: Card[] = [];
    private currentTurn: Team = 'A';
    private gamePhase: GamePhase = 'waiting';
    private currentClue: { word: string; count: number } | null = null;
    private guessesRemaining: number = 0;
    private scores = { A: 0, B: 0 };
    private winner: Team | null = null;
    
    // ===== 1. ADICIONANDO A PROPRIEDADE LOG =====
    private log: string[] = ["Aguardando jogadores..."];

    constructor(lobbyId: string) {
        this.lobbyId = lobbyId;
        this.players = new Map();
    }

    addPlayer(ws: WebSocket) {
        console.log(`Jogador conectado ao lobby ${this.lobbyId}`);
    }

    removePlayer(ws: WebSocket) {
        const player = this.players.get(ws);
        if (player) {
            this.players.delete(ws);
            this.log.push(`🚪 ${player.username} saiu da sala.`);
            console.log(`Jogador ${player.username} desconectado do lobby ${this.lobbyId}`);
            this.broadcastState();
        }
    }

    isEmpty(): boolean {
        return this.players.size === 0;
    }

    handleMessage(ws: WebSocket, messageStr: string) {
        try {
            const message: WsMessage = JSON.parse(messageStr);
            let player = this.players.get(ws);

            if (message.type === 'JOIN_GAME') {
                if (player) return; // Já está no jogo
                const newPlayer: Player = {
                    ws,
                    id: message.payload.userId,
                    username: message.payload.username,
                };
                this.players.set(ws, newPlayer);
                this.log.push(`👋 ${newPlayer.username} entrou na sala!`);
                console.log(`Jogador ${newPlayer.username} (${newPlayer.id}) juntou-se ao jogo ${this.lobbyId}`);
                this.broadcastState();
                return;
            }

            if (!player) return;

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
            }
        } catch (error) {
            console.error('Mensagem WebSocket inválida:', error);
        }
    }
    
    // ===== 2. ADICIONANDO ENTRADAS AO LOG NAS FUNÇÕES =====

    private startGame() {
        if (this.gamePhase !== 'waiting' || this.players.size < 4) {
            // Opcional: enviar erro de volta para o jogador que tentou iniciar
            return;
        }

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
        // Validações poderiam ser adicionadas aqui (ex: time já tem espião)
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
                this.log.push(`- neutro. Fim do turno.`);
                this.endTurn();
                break;
            case 'blue':
                this.scores.A--;
                this.log.push(`✅ Correto! Era uma carta Azul.`);
                if (this.currentTurn === 'A') {
                    this.guessesRemaining--;
                    if (this.guessesRemaining === 0) this.endTurn();
                } else {
                    this.log.push(`- ops! Era do outro time. Fim do turno.`);
                    this.endTurn();
                }
                break;
            case 'red':
                this.scores.B--;
                this.log.push(`✅ Correto! Era uma carta Vermelha.`);
                if (this.currentTurn === 'B') {
                    this.guessesRemaining--;
                    if (this.guessesRemaining === 0) this.endTurn();
                } else {
                    this.log.push(`- ops! Era do outro time. Fim do turno.`);
                    this.endTurn();
                }
                break;
        }
        
        if (this.winner) return; // Se o jogo já acabou no switch, não continue

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

    private endGame(winner: Team) {
        if (this.winner) return; // Previne múltiplos fins de jogo
        this.winner = winner;
        this.gamePhase = 'ended';
        this.board.forEach(c => c.revealed = true);
        const teamName = winner === 'A' ? "Azul" : "Vermelho";
        this.log.push(`🏆 O Time ${teamName} venceu!`);
        this.broadcastState();
    }

    // ===== 3. INCLUINDO O LOG NO BROADCAST =====
    private broadcastState() {
        const playersList = Array.from(this.players.values()).map(p => ({
            id: p.id,
            username: p.username,
            team: p.team,
            role: p.role,
        }));

        this.players.forEach((player, ws) => {
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
                log: this.log, // <-- LOG INCLUÍDO AQUI
            };

            const message: WsMessage = {
                type: 'GAME_STATE_UPDATE',
                payload: stateForPlayer
            };

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }
    
    private shuffleArray(array: any[]) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }
}