// src/hooks/useMultiTabPrevention.ts
import { useState, useEffect, useRef } from 'react';

type SessionState = 'CHECKING' | 'ACTIVE' | 'BLOCKED';
const CHANNEL_NAME = 'codenames_game_session_channel';

export function useMultiTabPrevention(): SessionState {
    const [sessionState, setSessionState] = useState<SessionState>('CHECKING');
    // Usamos uma ref para garantir que o canal só seja criado uma vez
    const channelRef = useRef<BroadcastChannel | null>(null);

    // Usamos uma ref para saber se esta aba se considera a ativa
    const isThisTabActive = useRef(false);

    useEffect(() => {
        // Garante que o código só rode no navegador
        if (typeof window === 'undefined' || !window.BroadcastChannel) {
            console.warn('BroadcastChannel API not supported, multi-tab prevention is disabled.');
            setSessionState('ACTIVE'); // Fallback para navegadores antigos
            return;
        }

        // Cria o canal de comunicação
        if (!channelRef.current) {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);
        }
        const channel = channelRef.current;

        const handleMessage = (event: MessageEvent) => {
            // Se outra aba perguntar quem está ativo, e esta aba for a ativa, responda.
            if (event.data === 'ASK_FOR_ACTIVE_SESSION' && isThisTabActive.current) {
                channel.postMessage('IM_ACTIVE');
            }

            // Se outra aba responder que ela está ativa, esta aba se bloqueia.
            if (event.data === 'IM_ACTIVE') {
                setSessionState('BLOCKED');
            }
        };

        channel.addEventListener('message', handleMessage);

        // Timeout para se auto-declarar a aba ativa
        const timer = setTimeout(() => {
            // Se, após 250ms, ninguém respondeu, esta aba se torna a ativa.
            if (sessionState === 'CHECKING') {
                setSessionState('ACTIVE');
                isThisTabActive.current = true;
                // Anuncia para qualquer outra aba que possa abrir a partir de agora
                channel.postMessage('IM_ACTIVE');
            }
        }, 250);

        // Pergunta no canal se já existe uma aba ativa
        channel.postMessage('ASK_FOR_ACTIVE_SESSION');

        // Função de limpeza ao desmontar o componente
        return () => {
            clearTimeout(timer);
            channel.removeEventListener('message', handleMessage);
            // Não fechamos o canal, para que a aba possa continuar respondendo
        };
    }, [sessionState]); // A dependência garante que o listener reaja a mudanças de estado

    return sessionState;
}