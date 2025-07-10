// src/components/Chat/Chat.tsx

import { useEffect, useRef, useState } from 'react';

// Interface da Mensagem (pode ser movida para um arquivo de tipos no futuro)
interface Message {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}

// Props que o componente recebe do GameScreen
interface ChatProps {
    lobbyId: string;
    userId: string;
    username: string;
}

export default function Chat({ lobbyId, userId, username }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const formatTime = (date: Date): string => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return '--:--';
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Este useEffect gerencia a conexão WebSocket do chat de forma independente.
    useEffect(() => {
        // Constrói a URL dinamicamente para passar pelo Nginx
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const socketUrl = `${protocol}//${host}/ws/chat/${lobbyId}?userId=${userId}&username=${encodeURIComponent(username)}`;

        console.log(`[Chat] Montando componente e tentando conectar a: ${socketUrl}`);
        
        const socket = new WebSocket(socketUrl);
        ws.current = socket;

        socket.onopen = () => {
            console.log(`[Chat] Conexão WebSocket estabelecida para o lobby ${lobbyId}`);
        };

        socket.onerror = (error) => {
            console.error('[Chat] WebSocket error:', error);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'message_history') {
                    setMessages(data.messages.map((msg: Message) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    })));
                } else if (data.type === 'chat_message') {
                    setMessages(prev => [...prev, {
                        ...data,
                        timestamp: new Date(data.timestamp)
                    }]);
                }
            } catch (error) {
                console.error("[Chat] Erro ao processar mensagem do servidor:", error);
            }
        };

        socket.onclose = (event) => {
            console.log(`[Chat] Conexão WebSocket fechada. Código: ${event.code}`);
        };

        // Função de limpeza: Fecha a conexão quando o componente é desmontado
        return () => {
            console.log('[Chat] Desmontando componente e fechando a conexão WebSocket.');
            socket.close();
        };
        // As dependências garantem que uma nova conexão seja feita se o usuário ou lobby mudar.
    }, [lobbyId, userId, username]);

    // Efeito para rolar para a última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = () => {
        if (newMessage.trim() && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'chat_message',
                text: newMessage.trim()
            }));
            setNewMessage('');
        }
    };

    return (
        // Aplicando o estilo da sua versão antiga que funcionava
        <div className="flex flex-col h-full min-h-0 bg-gray-900 text-white">
            <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4 space-y-2">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full text-sm ${String(msg.userId) === String(userId) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-2 rounded-lg break-words ${String(msg.userId) === String(userId) ? 'bg-blue-600' : 'bg-gray-700'} max-w-[80%]`}>
                            {String(msg.userId) !== String(userId) && (
                                <div className="font-bold text-blue-300 mb-1">{msg.username || 'Anônimo'}</div>
                            )}
                            <div className="whitespace-pre-wrap">{msg.text}</div>
                            <div className="text-xs opacity-60 text-right mt-1">{formatTime(msg.timestamp)}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 md:p-4 bg-gray-800 border-t border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 w-full p-2 border border-gray-600 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                        placeholder="Digite uma mensagem..."
                    />
                    <button
                        onClick={handleSendMessage}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                        disabled={!newMessage.trim()}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}