// src/GameManager.ts
import { WebSocket } from 'ws';
import { Game } from './Game'; // Criaremos este arquivo a seguir
import { pool } from '../db';

export class GameManager {
    private games: Map<string, Game>; // lobbyId -> Game instance

    constructor() {
        this.games = new Map();
    }

    // Quando um jogador se conecta via WebSocket
    public async addPlayer(lobbyId: string, ws: WebSocket) {
        let game = this.games.get(lobbyId);

        if (!game) {
            try {
                // Busca o ID do criador do lobby no banco de dados
                const lobbyRes = await pool.query('SELECT created_by FROM lobbys WHERE code_lobby = $1', [lobbyId]);
                if (lobbyRes.rows.length === 0) {
                    console.log(`[GameManager] Tentativa de conexão com lobby inexistente: ${lobbyId}`);
                    ws.close(1011, 'Lobby não existe.');
                    return;
                }
                const creatorId = lobbyRes.rows[0].created_by;

                console.log(`Criando novo jogo para o lobby ${lobbyId} (Criador: ${creatorId})`);
                game = new Game(lobbyId, creatorId); // Passa o creatorId para o Game
                this.games.set(lobbyId, game);

            } catch (error) {
                console.error(`[GameManager] Erro ao criar jogo para lobby ${lobbyId}:`, error);
                ws.close(1011, 'Erro interno ao iniciar jogo.');
                return;
            }
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