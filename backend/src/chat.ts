// src/chat.ts

import { WebSocket } from 'ws';

// Define a estrutura de uma mensagem de chat
interface ChatMessage {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}

// Estendemos a interface do WebSocket para armazenar dados do usuário
interface UserWebSocket extends WebSocket {
    userId: string;
    username: string;
}

class ChatManager {
    // Usamos um Map para armazenar as salas de chat. A chave é o lobbyId.
    // O valor é um Set de WebSockets de usuários conectados àquela sala.
    private rooms: Map<string, Set<UserWebSocket>> = new Map();
    // Armazena o histórico de mensagens por sala
    private messageHistory: Map<string, ChatMessage[]> = new Map();

    /**
     * Lida com uma nova conexão de WebSocket para o chat.
     */
    public handleConnection(ws: UserWebSocket, lobbyId: string, userId: string, username: string) {
        // Atribui os dados do usuário ao objeto WebSocket para fácil acesso
        ws.userId = userId;
        ws.username = username;

        // Se a sala não existe, cria uma nova
        if (!this.rooms.has(lobbyId)) {
            this.rooms.set(lobbyId, new Set());
            this.messageHistory.set(lobbyId, []);
            console.log(`[Chat] Nova sala de chat criada para o lobby: ${lobbyId}`);
        }

        // Adiciona o usuário à sala
        const room = this.rooms.get(lobbyId)!;
        room.add(ws);
        console.log(`[Chat] Usuário ${username} (${userId}) entrou no chat do lobby ${lobbyId}.`);

        // Envia o histórico de mensagens para o usuário que acabou de conectar
        const history = this.messageHistory.get(lobbyId) || [];
        ws.send(JSON.stringify({
            type: 'message_history',
            messages: history
        }));

        // Configura os listeners para esta conexão
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

    /**
     * Processa uma nova mensagem recebida de um usuário.
     */
    private handleMessage(lobbyId: string, senderWs: UserWebSocket, messageStr: string) {
        try {
            const parsedMessage = JSON.parse(messageStr);
            
            // Verificamos se é uma mensagem de chat válida
            if (parsedMessage.type === 'chat_message' && parsedMessage.text) {
                const newMessage: ChatMessage = {
                    userId: senderWs.userId,
                    username: senderWs.username,
                    text: parsedMessage.text,
                    timestamp: new Date(),
                };
                
                // Adiciona a mensagem ao histórico
                this.messageHistory.get(lobbyId)?.push(newMessage);

                // Prepara a mensagem para ser enviada aos clientes
                const broadcastMessage = JSON.stringify({
                    type: 'chat_message',
                    ...newMessage
                });

                // Envia a mensagem para todos na sala
                this.broadcast(lobbyId, broadcastMessage);
                console.log(`[Chat] Mensagem de ${senderWs.username} no lobby ${lobbyId}: ${newMessage.text}`);
            }
        } catch (error) {
            console.error(`[Chat] Erro ao processar mensagem no lobby ${lobbyId}:`, error);
        }
    }

    /**
     * Lida com a desconexão de um usuário.
     */
    private handleDisconnect(lobbyId: string, ws: UserWebSocket) {
        const room = this.rooms.get(lobbyId);
        if (room) {
            room.delete(ws);
            console.log(`[Chat] Usuário ${ws.username} (${ws.userId}) saiu do chat do lobby ${lobbyId}.`);

            // Se a sala ficar vazia, podemos limpá-la para economizar memória
            if (room.size === 0) {
                this.rooms.delete(lobbyId);
                this.messageHistory.delete(lobbyId);
                console.log(`[Chat] Sala de chat do lobby ${lobbyId} está vazia e foi removida.`);
            }
        }
    }

    /**
     * Envia uma mensagem para todos os usuários em uma sala específica.
     */
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

// Exporta uma instância única (Singleton) do ChatManager
export const chatManager = new ChatManager();