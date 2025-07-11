import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Middleware para autenticar um token JWT presente nos cookies.
 * Se o token for válido, anexa o payload decodificado a `req.user`.
 * Rejeita a requisição se o token não existir ou for inválido.
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.token;

    if (!token) {
        res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
        return;
    }

    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };

        // ==========================================================
        // ==                    MUDANÇA PRINCIPAL                   ==
        // ==========================================================
        // Usamos o type cast '(req as any)' para dizer ao TypeScript
        // para ignorar a verificação de tipos nesta linha e nos permitir
        // adicionar a propriedade 'user'.
        (req as any).user = {
            id: decodedPayload.id
        };
        // ==========================================================
        
        next();

    } catch (err) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
        return;
    }
};

// Se você ainda tiver a função antiga, pode aplicar a mesma correção:
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ message: 'Não autenticado' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number };
        
        // A mesma lógica se aplica aqui se você quiser usar req.user
        // (req as any).user = { id: decoded.id };

        // Ou manter a forma antiga, que já funciona
        req.body.userId = decoded.id; 
        
        next();
    } catch {
        res.status(401).json({ message: 'Token inválido' });
        return;
    }
};