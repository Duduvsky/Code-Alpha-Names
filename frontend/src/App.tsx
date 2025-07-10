import { useState, useEffect } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";
import { WebSocketProvider } from "./context/WebSocketContext";
import LandingPage from "./components/LadingPage/LandingPage";

// Importando os componentes para a prevenção de múltiplas abas
import { useMultiTabPrevention } from "./hooks/useMultiTabPrevention";
import { MultiTabBlocker } from "./components/Game/MultiTabBlocker";

type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface ActiveLobby {
  id: string;
  difficulty: Difficulty;
}

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const sessionState = useMultiTabPrevention();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game">("dashboard");
  const [currentScreen, setCurrentScreen] = useState<"landing" | "login" | "dashboard" | "game">("landing");
  const [selectedLobby, setSelectedLobby] = useState<ActiveLobby | null>(null);
  const [gameWsUrl, setGameWsUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("userId", data.id);
          localStorage.setItem("username", data.username);
          setIsAuthenticated(true);
          setCurrentScreen("dashboard"); // <- já define a tela correta
        } else {
          handleLogout(false);
          setCurrentScreen("landing"); // <- fallback se não estiver autenticado
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    
    const savedLobby = sessionStorage.getItem('activeLobby');
    if (savedLobby) {
      try {
        const lobbyData: ActiveLobby = JSON.parse(savedLobby);
        handleEnterGame(lobbyData.id, lobbyData.difficulty, true);
      } catch (error) {
        console.error("Erro ao restaurar lobby salvo:", error);
        sessionStorage.removeItem('activeLobby');
      }
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentScreen("dashboard");
  };

  const handleLogout = async (performApiCall = true) => {
    if (performApiCall) {
      try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch(error) {
        console.error("Erro na chamada de logout da API:", error);
      }
    }
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    sessionStorage.removeItem('activeLobby');
    setIsAuthenticated(false);
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
    setGameWsUrl(null);
  };

  const handleEnterGame = (lobbyId: string, difficulty: Difficulty, isRestoring = false) => {
    const lobbyData: ActiveLobby = { id: lobbyId, difficulty };
    if (!isRestoring) { 
        sessionStorage.setItem('activeLobby', JSON.stringify(lobbyData));
    }
    
    setSelectedLobby(lobbyData);
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/game/${lobbyId}`;

    console.log(`[App.tsx] ${isRestoring ? 'Restaurando' : 'Entrando em'} jogo. Conectando WebSocket a: ${wsUrl}`);
    
    setGameWsUrl(wsUrl);
    setCurrentScreen("game");
  };

  const handleExitGame = () => {
    sessionStorage.removeItem('activeLobby');
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
    setGameWsUrl(null); 
  };

  // 1. Renderiza a tela de bloqueio se for uma aba duplicada
  if (sessionState === 'BLOCKED') {
    return <MultiTabBlocker />;
  }

  // 2. Renderiza uma tela de carregamento enquanto verifica
  if (sessionState === 'CHECKING') {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-300 h-12 w-12"></div>
        </div>
    );
  }

  // 3. Se a aba for ativa, renderiza o conteúdo principal
  const renderContent = () => {
    if (currentScreen === "landing") {
      return <LandingPage onStart={() => setCurrentScreen("login")} />;
    }

    if (!isAuthenticated) {
      return <AuthForm onLogin={handleLogin} goBack={() => setCurrentScreen("landing")} />;
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
        onBackToLanding={() => setCurrentScreen("landing")}  
      />
    );
  };


  return (
    <WebSocketProvider url={gameWsUrl}>
      {renderContent()}
    </WebSocketProvider>
  );
}

export default App;