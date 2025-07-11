import { Request, Response } from 'express';
import { pool } from '../db';
// ===================================================================
// 1. IMPORTAR O GAME MANAGER
// ===================================================================
import { gameManager } from '../game/GameManager';

const generateCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createLobby = async (req: Request, res: Response) => {
  const { name, game_mode_id, created_by, password } = req.body;

  if (!name || !game_mode_id || !created_by) {
    return res.status(400).json({ message: 'Nome, modo de jogo e criador são obrigatórios' });
  }

  const code_lobby = generateCode();

  try {
    const insertQuery = `
      INSERT INTO lobbys (code_lobby, name, created_by, game_mode_id, password, duration, players_size, status, started_at, updated_at, last_activity_at) 
      VALUES ($1, $2, $3, $4, $5, 0, 0, 'waiting', NOW(), NOW(), NOW()) 
      RETURNING *
    `;
    const insertParams = [code_lobby, name, created_by, game_mode_id, password || null];
    const result = await pool.query(insertQuery, insertParams);
    const lobby = result.rows[0];

    const additionalDataQuery = `
      SELECT u.username AS creator_name, gm.mode AS difficulty_name 
      FROM users u, game_modes gm 
      WHERE u.id = $1 AND gm.id = $2
    `;
    const additionalDataParams = [created_by, game_mode_id];
    const additionalData = await pool.query(additionalDataQuery, additionalDataParams);

    const { password: _, ...lobbyData } = lobby;

    res.status(201).json({
      ...lobbyData,
      is_private: !!password,
      creator_name: additionalData.rows[0].creator_name,
      difficulty_name: additionalData.rows[0].difficulty_name
    });
  } catch (err: any) {
    console.error("Erro detalhado ao criar lobby:", err);
    res.status(500).json({ message: 'Erro interno ao criar lobby' });
  }
};

export const getLobbys = async (req: Request, res: Response) => {
  const { search } = req.query;
  try {
    const baseQuery = `
            SELECT 
                lobbys.id, lobbys.code_lobby, lobbys.name, lobbys.players_size, lobbys.duration,
                lobbys.status, lobbys.password IS NOT NULL as is_private,
                users.username as creator_name, 
                game_modes.mode as difficulty_name
            FROM lobbys
            JOIN users ON lobbys.created_by = users.id
            JOIN game_modes ON lobbys.game_mode_id = game_modes.id
            WHERE lobbys.finished_at IS NULL AND lobbys.status != 'finished'
        `;

    const searchCondition = `AND (LOWER(lobbys.code_lobby) LIKE $1 OR LOWER(lobbys.name) LIKE $1)`;
    const orderBy = `ORDER BY lobbys.started_at DESC, lobbys.id DESC`;

    const query = search ? `${baseQuery} ${searchCondition} ${orderBy}` : `${baseQuery} ${orderBy}`;
    const params = search ? [`%${(search as string).toLowerCase()}%`] : [];

    const result = await pool.query(query, params);

    // ===================================================================
    // 2. ENRIQUECER OS DADOS DO LOBBY COM A LISTA DE JOGADORES
    // ===================================================================
    const lobbiesWithPlayers = result.rows.map(lobby => {
      // Tenta pegar a instância do jogo para qualquer lobby ativo
      const game = gameManager.getGame(lobby.code_lobby);

      // Se a instância existir (ou seja, há jogadores na memória), adiciona os IDs.
      // Se não, retorna o lobby como está.
      const playerIds = game ? game.getPlayerIds() : [];

      return { ...lobby, playerIds };
    });

    res.json(lobbiesWithPlayers);

  } catch (err: any) {
    console.error("Erro ao listar lobbys:", err.message);
    res.status(500).json({ message: 'Erro ao listar lobbys' });
  }
};

// ===================================================================
// 3. NOVA ROTA PARA VERIFICAR SENHA SEM ENTRAR
// ===================================================================
export const verifyLobby = async (req: Request, res: Response) => {
  const { code } = req.params;
  const { password } = req.query;

  try {
    const result = await pool.query(
      `SELECT password FROM lobbys WHERE code_lobby = $1 AND finished_at IS NULL`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lobby não encontrado ou já finalizado.' });
    }

    const lobby = result.rows[0];

    if (lobby.password && lobby.password !== password) {
      return res.status(403).json({ message: 'Senha incorreta.' });
    }

    // Se a senha estiver correta ou se não houver senha, retorna sucesso
    res.status(200).json({ message: 'Verificação bem-sucedida.' });

  } catch (err: any) {
    console.error("Erro ao verificar lobby:", err.message);
    res.status(500).json({ message: 'Erro interno ao verificar lobby.' });
  }
};

// ESTA ROTA FOI SUBSTITUÍDA PELA LÓGICA NO Game.ts, MAS PODE SER MANTIDA
// PARA OUTROS USOS SE NECESSÁRIO, OU REMOVIDA.
export const getLobbyByCode = async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      `SELECT l.*, l.password IS NOT NULL as is_private, u.username as creator_name 
             FROM lobbys l 
             JOIN users u ON l.created_by = u.id
             WHERE l.code_lobby = $1`, [code]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lobby não encontrado' });
    }
    const { password: _, ...lobbyData } = result.rows[0];
    res.json(lobbyData);
  } catch (err: any) {
    console.error("Erro ao buscar lobby:", err.message);
    res.status(500).json({ message: 'Erro ao buscar lobby' });
  }
};


export const updateLobbySize = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { size } = req.body;
  try {
    await pool.query('UPDATE lobbys SET players_size = $1, updated_at = NOW() WHERE id = $2', [size, id]);
    res.json({ message: 'Tamanho atualizado com sucesso' });
  } catch (err: any) {
    res.status(500).json({ message: 'Erro ao atualizar tamanho' });
  }
};

export const updateLobbyDuration = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { duration } = req.body;
  try {
    await pool.query('UPDATE lobbys SET duration = $1, updated_at = NOW() WHERE id = $2', [duration, id]);
    res.json({ message: 'Duração atualizada com sucesso' });
  } catch (err: any) {
    res.status(500).json({ message: 'Erro ao atualizar duração' });
  }
};

export const getGameModes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM game_modes ORDER BY id ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: 'Erro ao listar modos de jogo' });
  }
};

export const deleteLobby = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "ID do usuário é obrigatório." });
  }
  try {
    const result = await pool.query('SELECT created_by FROM lobbys WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lobby não encontrado" });
    }
    if (result.rows[0].created_by !== Number(userId)) {
      return res.status(403).json({ message: "Você não tem permissão para deletar este lobby" });
    }
    await pool.query('DELETE FROM lobbys WHERE id = $1', [id]);
    return res.status(200).json({ message: "Lobby deletado com sucesso" });
  } catch (err: any) {
    console.error("Erro ao deletar lobby:", err.message);
    return res.status(500).json({ message: "Erro ao deletar lobby" });
  }
};