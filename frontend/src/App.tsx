import { useState, useEffect } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game">("dashboard");
  const [selectedLobby, setSelectedLobby] = useState<{id: string, difficulty: "fácil" | "normal" | "difícil" | "HARDCORE"} | null>(null);

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
          localStorage.setItem("username", data.username); // Adicionado para armazenar o username
          setIsAuthenticated(true);
        }
      } catch {
        // Não autenticado
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const API_URL = import.meta.env.VITE_API_URL;
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
    
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
  };

  const handleEnterGame = (lobbyId: string, difficulty: "fácil" | "normal" | "difícil" | "HARDCORE") => {
    setSelectedLobby({id: lobbyId, difficulty});
    setCurrentScreen("game");
  };

  const handleExitGame = () => {
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
  };

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
}

export default App;