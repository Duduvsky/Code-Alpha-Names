import { useEffect, useRef, useState } from 'react';

interface Message {
    userId: string;
    username: string;
    text: string;
    timestamp: Date;
}

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

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const socket = new WebSocket(
            `ws://localhost:3000/api/chat?lobbyId=${lobbyId}&userId=${userId}&username=${encodeURIComponent(username)}`
        );

        socket.onopen = () => console.log('Conexão WebSocket estabelecida');

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'message_history') {
                setMessages(data.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
            } else if (data.type === 'chat_message') {
                setMessages(prev => [...prev, {
                    userId: data.userId,
                    username: data.username,
                    text: data.text,
                    timestamp: new Date(data.timestamp)
                }]);
            }
        };

        socket.onclose = () => console.log('Conexão WebSocket fechada');

        ws.current = socket;

        return () => {
            socket.close();
        };
    }, [lobbyId, userId, username]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (newMessage.trim() && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'chat_message',
                text: newMessage
            }));
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Área de mensagens com rolagem */}
            <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.userId === userId ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`p-3 rounded-lg break-words ${msg.userId === userId ? 'bg-blue-500 text-white ml-16' : 'bg-gray-200 text-gray-800 mr-16'} w-fit max-w-[90%]`}>
                    {msg.userId !== userId ? (
                    <>
                        <div className="font-semibold text-left">{msg.username || 'Anônimo'}</div>
                        <div>{msg.text}</div>
                        <div className="text-xs opacity-70 text-left">{formatTime(msg.timestamp)}</div>
                    </>
                    ) : (
                    <>  
                        <div className="font-semibold text-right">Você</div>
                        <div>{msg.text}</div>
                        <div className="text-xs opacity-70 text-right">{formatTime(msg.timestamp)}</div>
                    </>
                    )}
                </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
            </div>

            {/* Área de input fixa na parte inferior */}
            <div className="p-4 bg-white">
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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                disabled={!newMessage.trim()}
                >
                Enviar
                </button>
            </div>
            </div>
        </div>
        );
}
