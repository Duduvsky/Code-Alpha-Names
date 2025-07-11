// src/hooks/useMultiTabPrevention.ts
import { useState, useEffect, useRef } from 'react';

type SessionState = 'CHECKING' | 'ACTIVE' | 'BLOCKED';
const CHANNEL_NAME = 'codenames_game_session_channel';

export function useMultiTabPrevention(): SessionState {
    const [sessionState, setSessionState] = useState<SessionState>('CHECKING');
    const channelRef = useRef<BroadcastChannel | null>(null);

    const isThisTabActive = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.BroadcastChannel) {
            console.warn('BroadcastChannel API not supported, multi-tab prevention is disabled.');
            setSessionState('ACTIVE'); // Fallback para navegadores antigos
            return;
        }

        if (!channelRef.current) {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);
        }
        const channel = channelRef.current;

        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'ASK_FOR_ACTIVE_SESSION' && isThisTabActive.current) {
                channel.postMessage('IM_ACTIVE');
            }

            if (event.data === 'IM_ACTIVE') {
                setSessionState('BLOCKED');
            }
        };

        channel.addEventListener('message', handleMessage);

        const timer = setTimeout(() => {
            if (sessionState === 'CHECKING') {
                setSessionState('ACTIVE');
                isThisTabActive.current = true;
                channel.postMessage('IM_ACTIVE');
            }
        }, 250);

        channel.postMessage('ASK_FOR_ACTIVE_SESSION');

        return () => {
            clearTimeout(timer);
            channel.removeEventListener('message', handleMessage);
        };
    }, [sessionState]);
    
    return sessionState;
}