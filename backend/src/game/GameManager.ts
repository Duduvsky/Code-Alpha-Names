// src/GameManager.ts
import { WebSocket } from 'ws';
import { Game } from './Game'; 
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
                // ===================================================================
                // 1. QUERY MODIFICADA PARA BUSCAR AS REGRAS DO JOGO
                // ===================================================================
                const lobbyQuery = `
                    SELECT 
                        l.created_by,
                        gm.round_duration,
                        gm.black_cards
                    FROM lobbys l
                    JOIN game_modes gm ON l.game_mode_id = gm.id
                    WHERE l.code_lobby = $1
                `;
                const lobbyRes = await pool.query(lobbyQuery, [lobbyId]);

                if (lobbyRes.rows.length === 0) {
                    console.log(`[GameManager] Tentativa de conexão com lobby inexistente: ${lobbyId}`);
                    ws.close(1011, 'Lobby não existe.');
                    return;
                }

                const dbData = lobbyRes.rows[0];
                const creatorId = dbData.created_by;

                // ===================================================================
                // 2. CRIAÇÃO DO OBJETO DE CONFIGURAÇÕES
                // ===================================================================
                const settings = {
                    roundDuration: dbData.round_duration,
                    blackCards: dbData.black_cards,
                };

                console.log(`[GameManager] Criando novo jogo para o lobby ${lobbyId} (Criador: ${creatorId})`);
                console.log(`[GameManager] Configurações do modo:`, settings);

                // ===================================================================
                // 3. PASSANDO AS CONFIGURAÇÕES PARA O CONSTRUTOR DO JOGO
                // ===================================================================
                game = new Game(lobbyId, creatorId, settings);
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
                console.log(`[GameManager] Removendo jogo vazio do lobby ${lobbyId}`);
                this.games.delete(lobbyId);
            }
        }
    }
}