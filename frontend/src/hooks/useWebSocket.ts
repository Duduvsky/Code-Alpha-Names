import { useContext } from 'react';
import { WebSocketContext } from '../context/WebSocketContext';
import type { WebSocketContextType } from '../context/WebSocketContext';

export const useWebSocket = (): WebSocketContextType => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket deve ser usado dentro de um WebSocketProvider');
    }
    return context;
};