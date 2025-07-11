// src/controllers/history.controller.ts
import { Request, Response } from 'express';
import { pool } from '../db';

export const getMatchHistory = async (req: Request, res: Response) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: 'User ID é obrigatório.' });
    }

    try {
        const query = `
            SELECT
                l.id AS "lobbyId",
                l.name AS "lobbyName",
                gm.mode AS "difficulty",
                l.finished_at AS "finishedAt",
                ul.winner AS "userWon"
            FROM users_lobbys ul
            JOIN lobbys l ON ul.id_lobby = l.id
            JOIN game_modes gm ON l.game_mode_id = gm.id
            WHERE ul.id_user = $1 AND l.status = 'finished'
            ORDER BY l.finished_at DESC
            LIMIT 20;
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);

    } catch (err: any) {
        console.error("Erro ao buscar histórico de partidas:", err.message);
        res.status(500).json({ message: 'Erro ao buscar histórico de partidas' });
    }
};