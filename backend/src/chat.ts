// server/chat.ts
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';

interface User {
    userId: string;
    username: string;
    ws: WebSocket;
}

interface Message {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}

const lobbies = new Map<string, { users: User[]; messages: Message[] }>();

export function setupChatWebSocket(server: Server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket, req: import('http').IncomingMessage) => {
        // Extrai parâmetros da URL
        const params = new URLSearchParams(req.url?.split('?')[1] || '');
        const lobbyId = params.get('lobbyId');
        const userId = params.get('userId');
        const username = decodeURIComponent(params.get('username') || 'Anônimo');

        if (!lobbyId || !userId || !username) {
            ws.close(4000, 'Missing parameters');
            return;
        }

        // Cria lobby se não existir
        if (!lobbies.has(lobbyId)) {
            lobbies.set(lobbyId, { users: [], messages: [] });
        }

        const lobby = lobbies.get(lobbyId)!;
        const user: User = { userId, username, ws };

        // Adiciona usuário ao lobby
        lobby.users.push(user);

        // Envia histórico de mensagens
        ws.send(JSON.stringify({
            type: 'message_history',
            messages: lobby.messages
        }));

        // Notifica outros usuários
        broadcastToLobby(lobbyId, {
            type: 'user_joined',
            userId,
            username
        });

        interface ChatMessagePayload {
            type: 'chat_message';
            text: string;
        }

        ws.on('message', (data: RawData, isBinary: boolean) => {
            const message: ChatMessagePayload = JSON.parse(data.toString());

            if (message.type === 'chat_message') {
                const chatMessage: Message = {
                    userId,
                    username,
                    text: message.text,
                    timestamp: new Date()
                };

                // Adiciona mensagem ao histórico
                lobby.messages.push(chatMessage);

                // Transmite para todos no lobby
                broadcastToLobby(lobbyId, {
                    type: 'chat_message',
                    ...chatMessage
                });
            }
        });

        ws.on('close', (code: number, reason: Buffer) => {
            // Remove usuário do lobby
            lobby.users = lobby.users.filter((u: User) => u.userId !== userId);

            // Notifica outros usuários
            broadcastToLobby(lobbyId, {
                type: 'user_left',
                userId,
                username
            });
        });
    });

    function broadcastToLobby(lobbyId: string, message: any) {
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;

        lobby.users.forEach(user => {
            if (user.ws.readyState === user.ws.OPEN) {
                user.ws.send(JSON.stringify(message));
            }
        });
    }
}