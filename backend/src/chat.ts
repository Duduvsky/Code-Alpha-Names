// src/chat.ts

import { WebSocket, RawData } from 'ws';

// Estruturas de dados (iguais às que você já tinha)
interface User {
    userId: string;
    username:string;
    ws: WebSocket;
}

interface Message {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}

// O ChatManager vai encapsular o mapa de lobbies e as funções de broadcast
class ChatManager {
    private lobbies = new Map<string, { users: User[]; messages: Message[] }>();

    // Adiciona um novo usuário a um lobby de chat
    public addUser(lobbyId: string, userId: string, username: string, ws: WebSocket) {
        // Cria o lobby se ele não existir
        if (!this.lobbies.has(lobbyId)) {
            this.lobbies.set(lobbyId, { users: [], messages: [] });
            console.log(`[Chat] Novo lobby de chat criado: ${lobbyId}`);
        }

        const lobby = this.lobbies.get(lobbyId)!;
        const user: User = { userId, username, ws };
        lobby.users.push(user);
        
        console.log(`[Chat] Usuário ${username} (${userId}) entrou no chat do lobby ${lobbyId}`);

        // Envia o histórico de mensagens apenas para o usuário que acabou de entrar
        ws.send(JSON.stringify({
            type: 'message_history',
            messages: lobby.messages
        }));

        // Notifica os outros usuários que alguém entrou
        this.broadcast(lobbyId, {
            type: 'user_joined',
            userId,
            username
        }, ws); // Exclui o próprio usuário da notificação de entrada
    }

    // Remove um usuário de um lobby
    public removeUser(lobbyId: string, ws: WebSocket) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;

        let removedUser: User | undefined;
        // Filtra o usuário que está se desconectando
        lobby.users = lobby.users.filter(user => {
            if (user.ws === ws) {
                removedUser = user;
                return false;
            }
            return true;
        });

        if (removedUser) {
            console.log(`[Chat] Usuário ${removedUser.username} saiu do chat do lobby ${lobbyId}`);
            // Notifica os usuários restantes que alguém saiu
            this.broadcast(lobbyId, {
                type: 'user_left',
                userId: removedUser.userId,
                username: removedUser.username
            });
        }
        
        // Opcional: Limpar o lobby se ele ficar vazio
        if (lobby.users.length === 0) {
            console.log(`[Chat] Lobby de chat ${lobbyId} está vazio. Removendo.`);
            this.lobbies.delete(lobbyId);
        }
    }

    // Processa uma nova mensagem recebida
    public handleMessage(lobbyId: string, ws: WebSocket, data: RawData) {
        const lobby = this.lobbies.get(lobbyId);
        const sender = lobby?.users.find(u => u.ws === ws);

        if (!lobby || !sender) return;

        try {
            const messagePayload = JSON.parse(data.toString());
            
            if (messagePayload.type === 'chat_message') {
                const chatMessage: Message = {
                    userId: sender.userId,
                    username: sender.username,
                    text: messagePayload.text,
                    timestamp: new Date(),
                };

                // Armazena a mensagem no histórico do lobby
                lobby.messages.push(chatMessage);
                // Limita o histórico para não crescer indefinidamente
                if (lobby.messages.length > 100) {
                    lobby.messages.shift();
                }

                // Transmite a nova mensagem para todos no lobby
                this.broadcast(lobbyId, {
                    type: 'chat_message',
                    ...chatMessage,
                });
            }

        } catch (error) {
            console.error('[Chat] Erro ao processar mensagem:', error);
        }
    }

    // Função de broadcast, pode excluir um ws específico se necessário
    private broadcast(lobbyId: string, message: any, excludeWs?: WebSocket) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return;

        const messageStr = JSON.stringify(message);
        lobby.users.forEach(user => {
            if (user.ws !== excludeWs && user.ws.readyState === WebSocket.OPEN) {
                user.ws.send(messageStr);
            }
        });
    }
}

// Crie uma instância singleton do ChatManager para ser usada em todo o app
export const chatManager = new ChatManager();