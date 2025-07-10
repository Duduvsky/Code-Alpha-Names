import { useState, useEffect } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";
import { WebSocketProvider } from "./context/WebSocketContext";
import LandingPage from "./components/LadingPage/LandingPage";
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

  const [, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"landing" | "login" | "dashboard" | "game">("landing");
  const [selectedLobby, setSelectedLobby] = useState<ActiveLobby | null>(null);
  const [gameWsUrl, setGameWsUrl] = useState<string | null>(null);

  // ==========================================================
  // LÓGICA DE INICIALIZAÇÃO AJUSTADA
  // ==========================================================
  useEffect(() => {
    const initializeApp = async () => {
      let authenticated = false;
      try {
        const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("userId", data.id);
          localStorage.setItem("username", data.username);
          setIsAuthenticated(true);
          authenticated = true; // Marca que a autenticação foi bem-sucedida
        }
      } catch (err) {
        console.error("Falha na verificação de autenticação:", err);
      }

      // Agora, verificamos o lobby salvo.
      // Isso garante que só tentamos restaurar um jogo se o usuário estiver logado.
      const savedLobbyJson = sessionStorage.getItem('activeLobby');
      if (authenticated && savedLobbyJson) {
        console.log("[App] Lobby salvo encontrado. Tentando restaurar a sessão do jogo.");
        try {
          const lobbyData: ActiveLobby = JSON.parse(savedLobbyJson);
          // A flag `isRestoring` evita que a sessão seja salva novamente.
          handleEnterGame(lobbyData.id, lobbyData.difficulty, true); 
        } catch (error) {
          console.error("Erro ao restaurar lobby salvo:", error);
          sessionStorage.removeItem('activeLobby');
          // Se falhar, vai para o dashboard
          setCurrentScreen("dashboard");
        }
      } else if (authenticated) {
        // Se estiver autenticado mas sem jogo salvo, vai para o dashboard.
        setCurrentScreen("dashboard");
      } else {
        // Se não estiver autenticado, vai para a landing page.
        setCurrentScreen("landing");
        // Limpa qualquer resquício de lobby
        sessionStorage.removeItem('activeLobby');
      }
    };

    initializeApp();
    // A lista de dependências vazia [] garante que isso rode apenas uma vez.
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
    sessionStorage.removeItem('activeLobby'); // Limpa a sessão do jogo
    setIsAuthenticated(false);
    setCurrentScreen("landing"); // Leva para a landing page após o logout
    setSelectedLobby(null);
    setGameWsUrl(null);
  };

  // ==========================================================
  // LÓGICA DE ENTRADA NO JOGO AJUSTADA
  // ==========================================================
  const handleEnterGame = (lobbyId: string, difficulty: Difficulty, isRestoring = false) => {
    const lobbyData: ActiveLobby = { id: lobbyId, difficulty };
    
    // Salva no sessionStorage apenas se não for uma restauração de sessão.
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
    sessionStorage.removeItem('activeLobby'); // Limpa a sessão ao sair do jogo
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
    setGameWsUrl(null); 
  };

  if (sessionState === 'BLOCKED') {
    return <MultiTabBlocker />;
  }
  if (sessionState === 'CHECKING') {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-300 h-12 w-12"></div>
        </div>
    );
  }

  const renderContent = () => {
    switch(currentScreen) {
      case 'landing':
        return <LandingPage onStart={() => setCurrentScreen("login")} />;
      case 'login':
        return <AuthForm onLogin={handleLogin} goBack={() => setCurrentScreen("landing")} />;
      case 'game':
        if (selectedLobby) {
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
        // Fallback se algo der errado, volta para o dashboard
        setCurrentScreen("dashboard");
        return null;
      case 'dashboard':
      default:
        return (
          <Dashboard 
            onLogout={() => handleLogout()} // Garante que a chamada da API aconteça
            onEnterLobby={handleEnterGame}
            onBackToLanding={() => setCurrentScreen("landing")}  
          />
        );
    }
  };

  return (
    <WebSocketProvider url={gameWsUrl}>
      {renderContent()}
    </WebSocketProvider>
  );
}

export default App;