// src/routes/session.routes.ts
import { Router, RequestHandler  } from 'express';
import { pool } from '../db';
import { authenticateToken  } from '../middlewares/auth.middleware'; // Use seu middleware de autenticação!

const router = Router();

// <<< MUDANÇA 2: Crie uma constante para o handler com a tipagem correta
const getSessionStateHandler: RequestHandler = async (req, res) => {
     const userId = (req as any).user?.id;
     
    if (!userId) {
        // Esta checagem de segurança é boa, embora o middleware já proteja.
        res.status(401).json({ message: "Sessão de usuário inválida." });
        return; // Apenas para sair da função
    }

    try {
        const result = await pool.query(
            `SELECT u.current_lobby_code, l.game_mode_id, gm.mode as difficulty_name
             FROM users u
             LEFT JOIN lobbys l ON u.current_lobby_code = l.code_lobby
             LEFT JOIN game_modes gm ON l.game_mode_id = gm.id
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ message: "Usuário não encontrado." });
            return;
        }

        const lobbyCode = result.rows[0].current_lobby_code;
        const difficulty = result.rows[0].difficulty_name;

        if (!lobbyCode) {
            res.json({ activeLobby: null });
            return;
        }

        res.json({
            activeLobby: {
                id: lobbyCode,
                difficulty: difficulty
            }
        });

    } catch (error) {
        console.error("Erro ao buscar estado da sessão:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// <<< MUDANÇA 3: Use a constante do handler na definição da rota
router.get('/state', authenticateToken, getSessionStateHandler);

export default router;