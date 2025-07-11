import React, { createContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface WebSocketContextType {
    ws: WebSocket | null;
    isConnected: boolean;
    sendMessage: (type: string, payload: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export { WebSocketContext };

interface WebSocketProviderProps {
    url: string | null;
    children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ url, children }) => {
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