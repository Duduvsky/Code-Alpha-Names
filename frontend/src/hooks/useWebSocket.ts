// src/hooks/useWebSocket.ts

import { useContext } from 'react';
// Importe o CONTEXTO e o TIPO do arquivo original
import { WebSocketContext } from '../context/WebSocketContext';
import type { WebSocketContextType } from '../context/WebSocketContext';

// EXPORTE APENAS O HOOK
export const useWebSocket = (): WebSocketContextType => {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket deve ser usado dentro de um WebSocketProvider');
    }
    return context;
};