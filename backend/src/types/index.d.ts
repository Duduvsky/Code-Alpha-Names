// Este arquivo estende a definição de tipos do Express.

// Importante: Não adicione imports aqui. Este arquivo deve ser global.

declare namespace Express {
    export interface Request {
        user?: {
            id: number;

        };
    }
}