import { useEffect, useRef, useState } from 'react';

// A interface da mensagem não muda
interface Message {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}

// As props não mudam
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

    // Função auxiliar para formatar o tempo
    const formatTime = (date: Date) => {
        // Verifica se a data é válida antes de tentar formatar
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return '--:--'; // Retorna um placeholder se a data for inválida
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // O useEffect principal, onde faremos a única mudança necessária
    useEffect(() => {
        // ======================= INÍCIO DA MUDANÇA =======================
        
        // 1. Obtenha a URL base do seu arquivo .env
        const wsBaseUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000';

        // 2. Construa a URL final de acordo com o novo padrão do backend:
        //    /ws/chat/LOBBY_ID?userId=...&username=...
        const socketUrl = `${wsBaseUrl}/ws/chat/${lobbyId}?userId=${userId}&username=${encodeURIComponent(username)}`;

        // 3. Crie a instância do WebSocket com a nova URL
        const socket = new WebSocket(socketUrl);
        
        // ======================== FIM DA MUDANÇA =========================

        socket.onopen = () => {
            console.log(`[Chat] Conexão WebSocket estabelecida para o lobby ${lobbyId}`);
        };

        socket.onerror = (error) => {
            console.error('[Chat] WebSocket error:', error);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'message_history') {
                // Converte as timestamps de string para Date
                setMessages(data.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
            } else if (data.type === 'chat_message') {
                // Adiciona a nova mensagem, convertendo a timestamp
                setMessages(prev => [...prev, {
                    ...data,
                    timestamp: new Date(data.timestamp)
                }]);
            } else if (data.type === 'user_joined') {
                // Opcional: Adicionar uma mensagem de sistema ao chat
                console.log(`[Chat] ${data.username} entrou na sala.`);
                // Você poderia adicionar uma mensagem de sistema ao estado `messages` aqui se quisesse.
            } else if (data.type === 'user_left') {
                // Opcional: Adicionar uma mensagem de sistema ao chat
                console.log(`[Chat] ${data.username} saiu da sala.`);
            }
        };

        socket.onclose = () => {
            console.log('[Chat] Conexão WebSocket fechada.');
        };

        ws.current = socket;

        // Função de limpeza para fechar a conexão quando o componente for desmontado
        return () => {
            socket.close();
        };
    }, [lobbyId, userId, username]); // As dependências estão corretas

    // Este useEffect para rolagem automática está perfeito
    useEffect(() => {
        const timer = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return () => clearTimeout(timer);
    }, [messages]);

    // A função de envio de mensagem está perfeita
    const handleSendMessage = () => {
        if (newMessage.trim() && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'chat_message',
                text: newMessage.trim()
            }));
            setNewMessage('');
        }
    };

    // O JSX para renderização está perfeito
    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Área de mensagens com rolagem */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex w-full ${msg.userId === userId ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div className={`p-3 rounded-lg break-words ${msg.userId === userId ? 'bg-blue-500 text-white ml-16' : 'bg-gray-200 text-gray-800 mr-16'} w-fit max-w-[90%]`}>
                            {msg.userId !== userId ? (
                                <>
                                    <div className="font-semibold text-left">{msg.username || 'Anônimo'}</div>
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                    <div className="text-xs opacity-70 text-left pt-1">{formatTime(msg.timestamp)}</div>
                                </>
                            ) : (
                                <>
                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                    <div className="text-xs opacity-70 text-right pt-1">{formatTime(msg.timestamp)}</div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Área de input fixa */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite uma mensagem..."
                    />
                    <button
                        onClick={handleSendMessage}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        disabled={!newMessage.trim()}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
}