import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.token;

    if (!token) {
        res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
        return;
    }

    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };


        (req as any).user = {
            id: decodedPayload.id
        };
        
        next();

    } catch (err) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
        return;
    }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ message: 'Não autenticado' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
        
        req.body.userId = decoded.id; 
        
        next();
    } catch {
        res.status(401).json({ message: 'Token inválido' });
        return;
    }
};