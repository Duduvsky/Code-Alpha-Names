import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const createToken = (id: number): string => {
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

    if (!jwtSecret || !jwtExpiresIn) {
        throw new Error('JWT_SECRET or JWT_EXPIRES_IN is not defined');
    }

    const options: jwt.SignOptions = {
        expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn']
    };

    return jwt.sign({ id }, jwtSecret, options);
};

export const register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    try {
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Usuário ou e-mail já existe.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
            [username, email, hashedPassword]
        );

        const token = createToken(result.rows[0].id);
        res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
        res.status(201).json({ message: 'Usuário registrado com sucesso' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'E-mail não encontrado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Senha incorreta' });
        }

        const token = createToken(user.id);
        res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
        res.status(200).json({ message: 'Login bem-sucedido' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const logout = (_req: Request, res: Response) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout efetuado com sucesso' });
};