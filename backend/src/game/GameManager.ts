// src/GameManager.ts
import { WebSocket } from 'ws';
import { Game } from './Game'; // Criaremos este arquivo a seguir

export class GameManager {
    private games: Map<string, Game>; // lobbyId -> Game instance

    constructor() {
        this.games = new Map();
    }

    // Quando um jogador se conecta via WebSocket
    public addPlayer(lobbyId: string, ws: WebSocket) {
        let game = this.games.get(lobbyId);

        // Se o jogo não existe, cria um novo (isso pode ser ligado à sua lógica de lobby)
        if (!game) {
            console.log(`Criando novo jogo para o lobby ${lobbyId}`);
            game = new Game(lobbyId);
            this.games.set(lobbyId, game);
        }

        game.addPlayer(ws);
    }

    // Quando um jogador envia uma mensagem
    public handleMessage(lobbyId: string, ws: WebSocket, message: string) {
        const game = this.games.get(lobbyId);
        if (game) {
            game.handleMessage(ws, message);
        }
    }

    // Quando um jogador se desconecta
    public removePlayer(lobbyId: string, ws: WebSocket) {
        const game = this.games.get(lobbyId);
        if (game) {
            game.removePlayer(ws);
            // Opcional: se o jogo ficar vazio, removê-lo
            if (game.isEmpty()) {
                console.log(`Removendo jogo vazio do lobby ${lobbyId}`);
                this.games.delete(lobbyId);
            }
        }
    }
}