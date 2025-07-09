import React, { createContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Não exporte estes. Eles serão usados apenas internamente e pelo hook.
export interface WebSocketContextType {
    ws: WebSocket | null;
    isConnected: boolean;
    sendMessage: (type: string, payload: unknown) => void;
}

// Não exporte o contexto diretamente.
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Deixe o hook usá-lo importando-o (o que já fazemos)
export { WebSocketContext };

interface WebSocketProviderProps {
    url: string | null;
    children: ReactNode;
}

// Exporte APENAS o Provider como default ou nomeado
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ url, children }) => {
    // ... seu código do provider está perfeito, não precisa mudar nada aqui ...
    // ...
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!url) {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
                setIsConnected(false);
            }
            return;
        }
        if (ws.current) {
            ws.current.close();
        }
        const socket = new WebSocket(url);
        ws.current = socket;
        socket.onopen = () => setIsConnected(true);
        socket.onclose = () => setIsConnected(false);
        socket.onerror = () => setIsConnected(false);
        return () => {
            socket.close();
        };
    }, [url]);

    const sendMessage = (type: string, payload: unknown) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload }));
        }
    };

    const value = { ws: ws.current, isConnected, sendMessage };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};