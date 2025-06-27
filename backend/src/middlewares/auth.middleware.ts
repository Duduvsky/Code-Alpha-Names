import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Não autenticado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
        req.body.userId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ message: 'Token inválido' });
    }
};
