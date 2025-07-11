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

function App() {
  const sessionState = useMultiTabPrevention();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeLobby, setActiveLobby] = useState<ActiveLobby | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'checked'>('checking');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const authRes = await fetch(`/api/auth/me`, { credentials: 'include' });

        if (authRes.ok) {
          const userData = await authRes.json();
          localStorage.setItem("userId", userData.id);
          localStorage.setItem("username", userData.username);
          setIsAuthenticated(true);

          console.log("[App] Usuário autenticado. Verificando estado da sessão no servidor...");
          const sessionRes = await fetch(`/api/session/state`, { credentials: 'include' });
          
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            if (sessionData.activeLobby) {
              console.log("[App] Servidor informou lobby ativo. Restaurando sessão para:", sessionData.activeLobby);
              setActiveLobby(sessionData.activeLobby);
            } else {
              console.log("[App] Servidor informou que não há lobby ativo.");
            }
          }
        } else {
          handleLogout(false);
        }
      } catch (err) {
        console.error("Falha na inicialização da aplicação:", err);
        handleLogout(false);
      } finally {
        setAuthStatus('checked');
      }
    };
    initializeApp();
  }, []);

  const handleLoginSuccess = () => {
    window.location.reload();
  };
  
  const handleLogout = (performApiCall = true) => {
    if (performApiCall) {
      fetch(`/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(console.error);
    }
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setActiveLobby(null);
    setShowLogin(false);
  };
  
  const handleEnterLobby = (lobbyId: string, difficulty: Difficulty) => {
    console.log(`[App] Entrando no lobby ${lobbyId}. Atualizando estado da UI.`);
    setActiveLobby({ id: lobbyId, difficulty });
  };
  
  const handleExitLobby = () => {
    console.log("[App] Saindo do lobby. Limpando estado da UI.");
    setActiveLobby(null);
  };

  const gameWsUrl = activeLobby
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/game/${activeLobby.id}`
    : null;

  if (sessionState === 'BLOCKED') {
    return <MultiTabBlocker />;
  }
  
  if (authStatus === 'checking' || sessionState === 'CHECKING') {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-300 h-12 w-12"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
    );
  }

  return (
    <WebSocketProvider url={gameWsUrl}>
      {!isAuthenticated ? (
        showLogin ? (
          <AuthForm onLogin={handleLoginSuccess} goBack={() => setShowLogin(false)} />
        ) : (
          <LandingPage onStart={() => setShowLogin(true)} />
        )
      ) : activeLobby ? (
        <GameScreen 
          difficulty={activeLobby.difficulty} 
          onExit={handleExitLobby}
          lobbyId={activeLobby.id}
          userId={localStorage.getItem("userId") || ""}
          username={localStorage.getItem("username") || ""}
        />
      ) : (
        <Dashboard 
          onLogout={handleLogout}
          onEnterLobby={handleEnterLobby}
        />
      )}
    </WebSocketProvider>
  );
}

export default App;