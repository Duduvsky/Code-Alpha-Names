

import { WebSocket } from 'ws';

interface ChatMessage {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}


interface UserWebSocket extends WebSocket {
    userId: string;
    username: string;
}

class ChatManager {

    private rooms: Map<string, Set<UserWebSocket>> = new Map();

    private messageHistory: Map<string, ChatMessage[]> = new Map();


    public handleConnection(ws: UserWebSocket, lobbyId: string, userId: string, username: string) {

        ws.userId = userId;
        ws.username = username;


        if (!this.rooms.has(lobbyId)) {
            this.rooms.set(lobbyId, new Set());
            this.messageHistory.set(lobbyId, []);
            console.log(`[Chat] Nova sala de chat criada para o lobby: ${lobbyId}`);
        }


        const room = this.rooms.get(lobbyId)!;
        room.add(ws);
        console.log(`[Chat] Usuário ${username} (${userId}) entrou no chat do lobby ${lobbyId}.`);


        const history = this.messageHistory.get(lobbyId) || [];
        ws.send(JSON.stringify({
            type: 'message_history',
            messages: history
        }));


        ws.on('message', (message: string) => {
            this.handleMessage(lobbyId, ws, message);
        });

        ws.on('close', () => {
            this.handleDisconnect(lobbyId, ws);
        });

        ws.on('error', (error) => {
            console.error(`[Chat] Erro no WebSocket do usuário ${username}:`, error);
            this.handleDisconnect(lobbyId, ws);
        });
    }


    private handleMessage(lobbyId: string, senderWs: UserWebSocket, messageStr: string) {
        try {
            const parsedMessage = JSON.parse(messageStr);
            

            if (parsedMessage.type === 'chat_message' && parsedMessage.text) {
                const newMessage: ChatMessage = {
                    userId: senderWs.userId,
                    username: senderWs.username,
                    text: parsedMessage.text,
                    timestamp: new Date(),
                };
                

                this.messageHistory.get(lobbyId)?.push(newMessage);

                const broadcastMessage = JSON.stringify({
                    type: 'chat_message',
                    ...newMessage
                });

                this.broadcast(lobbyId, broadcastMessage);
                console.log(`[Chat] Mensagem de ${senderWs.username} no lobby ${lobbyId}: ${newMessage.text}`);
            }
        } catch (error) {
            console.error(`[Chat] Erro ao processar mensagem no lobby ${lobbyId}:`, error);
        }
    }


    private handleDisconnect(lobbyId: string, ws: UserWebSocket) {
        const room = this.rooms.get(lobbyId);
        if (room) {
            room.delete(ws);
            console.log(`[Chat] Usuário ${ws.username} (${ws.userId}) saiu do chat do lobby ${lobbyId}.`);


            if (room.size === 0) {
                this.rooms.delete(lobbyId);
                this.messageHistory.delete(lobbyId);
                console.log(`[Chat] Sala de chat do lobby ${lobbyId} está vazia e foi removida.`);
            }
        }
    }


    private broadcast(lobbyId: string, message: string) {
        const room = this.rooms.get(lobbyId);
        if (room) {
            room.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }
}


export const chatManager = new ChatManager();