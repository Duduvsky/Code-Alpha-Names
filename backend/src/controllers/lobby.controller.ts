import { Request, Response } from 'express';
import { pool } from '../db';


const generateCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createLobby = async (req: Request, res: Response) => {
  const { name, game_mode_id, created_by } = req.body;
  if (!name || !game_mode_id || !created_by) return res.status(400).json({ message: 'Nome, dificuldade e criador são obrigatórios' });

  const code_lobby = generateCode();
  try {
    const result = await pool.query(
      'INSERT INTO lobbys (code_lobby, game_mode_id, players_size, duration, name, created_by) VALUES ($1, $2, 0, 0, $3, $4) RETURNING *',
      [code_lobby, game_mode_id, name, created_by]
    );

    // Busca o nome do criador e o nome da dificuldade
    const lobby = result.rows[0];
    const additionalData = await pool.query(
      `SELECT users.username AS creator_name, game_modes.mode AS difficulty_name 
       FROM users, game_modes 
       WHERE users.id = $1 AND game_modes.id = $2`,
      [created_by, game_mode_id]
    );

    res.json({ ...lobby, creator_name: additionalData.rows[0].creator_name, difficulty_name: additionalData.rows[0].difficulty_name });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar lobby', error: err });
  }
};

export const getLobbys = async (req: Request, res: Response) => {
  const { search } = req.query;
  try {
    const query = search
      ? `SELECT lobbys.*, users.username as creator_name, game_modes.mode as difficulty_name FROM lobbys JOIN users ON lobbys.created_by = users.id JOIN game_modes ON lobbys.game_mode_id = game_modes.id WHERE LOWER(code_lobby) LIKE $1 OR LOWER(name) LIKE $1 ORDER BY lobbys.id DESC`
      : `SELECT lobbys.*, users.username as creator_name, game_modes.mode as difficulty_name FROM lobbys JOIN users ON lobbys.created_by = users.id JOIN game_modes ON lobbys.game_mode_id = game_modes.id ORDER BY lobbys.id DESC`;
    const params = search ? [`%${(search as string).toLowerCase()}%`] : [];
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar lobbys', error: err });
  }
};

export const getLobbyByCode = async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const result = await pool.query('SELECT * FROM lobbys WHERE code_lobby = $1', [code]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Lobby não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar lobby', error: err });
  }
};

export const updateLobbySize = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { size } = req.body;
  try {
    await pool.query('UPDATE lobbys SET players_size = $1, updated_at = NOW() WHERE id = $2', [size, id]);
    res.json({ message: 'Tamanho atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar tamanho', error: err });
  }
};

export const updateLobbyDuration = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { duration } = req.body;
  try {
    await pool.query('UPDATE lobbys SET duration = $1, finished_at = NOW(), updated_at = NOW() WHERE id = $2', [duration, id]);
    res.json({ message: 'Duração atualizada com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar duração', error: err });
  }
};

export const getGameModes = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM game_modes ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar modos de jogo', error: err });
  }
};
