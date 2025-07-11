// src/components/GameRouter.tsx (Novo Arquivo)

import { useState, useEffect } from 'react';
import Dashboard from '../Dashboard/Dashboard';
import GameScreen from './GameScreen';
import { WebSocketProvider } from '../../context/WebSocketContext'; // Verifique o caminho

// Tipos para clareza
type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";
interface CurrentLobbyState {
  id: string;
  difficulty: Difficulty;
}

const GameRouter = () => {
    // Tenta carregar o lobby do sessionStorage na primeira renderização
    const [currentLobby, setCurrentLobby] = useState<CurrentLobbyState | null>(() => {
        const savedLobby = sessionStorage.getItem('currentLobby');
        try {
            return savedLobby ? JSON.parse(savedLobby) : null;
        } catch (e) {
            console.error("Failed to parse lobby from sessionStorage", e);
            return null;
        }
    });

    // Pega os dados do usuário do localStorage
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    // Constrói a URL do WebSocket dinamicamente. Se não houver lobby, a URL é nula.
    const wsUrl = currentLobby 
      ? `${import.meta.env.VITE_WS_URL}/ws/game/${currentLobby.id}` 
      : null;

    // Efeito para salvar o estado no sessionStorage sempre que ele mudar
    useEffect(() => {
        if (currentLobby) {
            sessionStorage.setItem('currentLobby', JSON.stringify(currentLobby));
        } else {
            sessionStorage.removeItem('currentLobby');
        }
    }, [currentLobby]);
    
    // Função para entrar em um lobby, que será passada para o Dashboard
    const handleEnterLobby = (lobbyId: string, difficulty: Difficulty) => {
        setCurrentLobby({ id: lobbyId, difficulty });
    };

    // Função para sair de um lobby, que será passada para a GameScreen
    const handleExitLobby = () => {
        setCurrentLobby(null);
    };

    // Função de logout para limpar tudo
    const handleLogout = () => {
        // Lógica de API para invalidar o token no backend (se houver)
        // fetch('/api/auth/logout', { method: 'POST' });

        // Limpa o armazenamento local
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('token');
        sessionStorage.removeItem('currentLobby'); // Limpa também a sessão do jogo
        
        // Força um recarregamento para levar à tela de login
        window.location.reload(); 
    };

    // Guarda de segurança: se não estiver logado, nem renderiza o resto
    if (!userId || !username) {
        // Idealmente, você teria um componente <Navigate> do react-router-dom
        return <div>Você não está logado. Redirecionando...</div>;
    }

    return (
        // O Provider do WebSocket envolve as duas telas
        <WebSocketProvider url={wsUrl}>
            {currentLobby ? (
                // Se houver um lobby ativo, renderiza a tela do jogo
                <GameScreen
                    lobbyId={currentLobby.id}
                    difficulty={currentLobby.difficulty}
                    onExit={handleExitLobby}
                    userId={userId}
                    username={username}
                />
            ) : (
                // Caso contrário, mostra o Dashboard
                <Dashboard
                    onEnterLobby={handleEnterLobby}
                    onLogout={handleLogout}
                />
            )}
        </WebSocketProvider>
    );
};

export default GameRouter;