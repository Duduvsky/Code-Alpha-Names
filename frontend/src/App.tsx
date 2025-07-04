import { useState, useEffect } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";
import { WebSocketProvider } from "./context/WebSocketContext"; // <-- 1. Importe o Provider

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game">("dashboard");
  const [selectedLobby, setSelectedLobby] = useState<{id: string, difficulty: "fácil" | "normal" | "difícil" | "HARDCORE"} | null>(null);

  // 2. Crie um estado para a URL do WebSocket
  const [gameWsUrl, setGameWsUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const API_URL = import.meta.env.VITE_API_URL;
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("userId", data.id);
          localStorage.setItem("username", data.username);
          setIsAuthenticated(true);
        } else {
          // Limpa o local storage se o token/cookie for inválido
          localStorage.removeItem("userId");
          localStorage.removeItem("username");
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    // ... seu código de logout ...
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
    setGameWsUrl(null); // Garante que a conexão seja fechada no logout
  };

  const handleEnterGame = (lobbyId: string, difficulty: "fácil" | "normal" | "difícil" | "HARDCORE") => {
    setSelectedLobby({id: lobbyId, difficulty});
    
    // 3. Defina a URL do WebSocket ao entrar no jogo
    const wsBaseUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3000';
    setGameWsUrl(`${wsBaseUrl}/ws/game/${lobbyId}`);
    
    setCurrentScreen("game");
  };

  const handleExitGame = () => {
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
    
    // 4. Limpe a URL do WebSocket ao sair do jogo
    setGameWsUrl(null); 
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      return <AuthForm onLogin={handleLogin} />;
    }

    if (currentScreen === "game" && selectedLobby) {
      return (
        <GameScreen 
          difficulty={selectedLobby.difficulty} 
          onExit={handleExitGame}
          lobbyId={selectedLobby.id}
          userId={localStorage.getItem("userId") || ""}
          username={localStorage.getItem("username") || ""}
        />
      );
    }

    return (
      <Dashboard 
        onLogout={handleLogout} 
        onEnterLobby={handleEnterGame} 
      />
    );
  };

  return (
    // 5. Envolva o conteúdo renderizado com o Provider
    <WebSocketProvider url={gameWsUrl}>
      {renderContent()}
    </WebSocketProvider>
  );
}

export default App;