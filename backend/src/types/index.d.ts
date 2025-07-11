// Este arquivo estende a definição de tipos do Express.

// Importante: Não adicione imports aqui. Este arquivo deve ser global.

declare namespace Express {
    export interface Request {
        // Adicionamos a propriedade 'user' ao objeto Request.
        // Ela será opcional para que rotas não protegidas não causem erros.
        user?: {
            id: number;
            // Você pode adicionar outras propriedades do seu payload JWT aqui, se tiver.
            // Ex: username?: string;
        };
    }
}