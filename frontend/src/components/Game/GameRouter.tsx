import { useState, useEffect } from 'react';
import Dashboard from '../Dashboard/Dashboard';
import GameScreen from './GameScreen';
import { WebSocketProvider } from '../../context/WebSocketContext'; // Verifique o caminho

type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";
interface CurrentLobbyState {
  id: string;
  difficulty: Difficulty;
}

const GameRouter = () => {
    const [currentLobby, setCurrentLobby] = useState<CurrentLobbyState | null>(() => {
        const savedLobby = sessionStorage.getItem('currentLobby');
        try {
            return savedLobby ? JSON.parse(savedLobby) : null;
        } catch (e) {
            console.error("Failed to parse lobby from sessionStorage", e);
            return null;
        }
    });

    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");

    const wsUrl = currentLobby 
      ? `${import.meta.env.VITE_WS_URL}/ws/game/${currentLobby.id}` 
      : null;

    useEffect(() => {
        if (currentLobby) {
            sessionStorage.setItem('currentLobby', JSON.stringify(currentLobby));
        } else {
            sessionStorage.removeItem('currentLobby');
        }
    }, [currentLobby]);
    
    const handleEnterLobby = (lobbyId: string, difficulty: Difficulty) => {
        setCurrentLobby({ id: lobbyId, difficulty });
    };

    const handleExitLobby = () => {
        setCurrentLobby(null);
    };

    const handleLogout = () => {

        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('token');
        sessionStorage.removeItem('currentLobby'); 
        
        window.location.reload(); 
    };

    if (!userId || !username) {
        return <div>Você não está logado. Redirecionando...</div>;
    }

    return (
        <WebSocketProvider url={wsUrl}>
            {currentLobby ? (
                <GameScreen
                    lobbyId={currentLobby.id}
                    difficulty={currentLobby.difficulty}
                    onExit={handleExitLobby}
                    userId={userId}
                    username={username}
                />
            ) : (
                <Dashboard
                    onEnterLobby={handleEnterLobby}
                    onLogout={handleLogout}
                />
            )}
        </WebSocketProvider>
    );
};

export default GameRouter;