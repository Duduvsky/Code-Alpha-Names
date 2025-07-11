import { useState, useEffect } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";
import { WebSocketProvider } from "./context/WebSocketContext";
import LandingPage from "./components/LadingPage/LandingPage";
import { useMultiTabPrevention } from "./hooks/useMultiTabPrevention";
import { MultiTabBlocker } from "./components/Game/MultiTabBlocker";

// --- Tipos para clareza ---
type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface ActiveLobby {
  id: string;
  difficulty: Difficulty;
}

// --- Constantes ---
// Usar uma constante para a chave do localStorage evita erros de digitação.
const ACTIVE_LOBBY_KEY = 'codenames_active_lobby';

// --- Componente principal ---
function App() {
  const sessionState = useMultiTabPrevention();

  // --- Estado Centralizado ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeLobby, setActiveLobby] = useState<ActiveLobby | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'checked'>('checking');
  const [showLogin, setShowLogin] = useState(false);

  // --- Lógica de Inicialização (Roda uma única vez) ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const res = await fetch(`/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const userData = await res.json();
          localStorage.setItem("userId", userData.id);
          localStorage.setItem("username", userData.username);
          setIsAuthenticated(true);

          // <<< MUDANÇA: Lendo do localStorage >>>
          const savedLobbyJson = localStorage.getItem(ACTIVE_LOBBY_KEY);
          if (savedLobbyJson) {
            console.log("[App] Lobby salvo encontrado no localStorage. Restaurando sessão.");
            const lobbyData: ActiveLobby = JSON.parse(savedLobbyJson);
            setActiveLobby(lobbyData);
          }
        } else {
          // Se a verificação falhar, chama o logout sem a chamada da API.
          handleLogout(false);
        }
      } catch (err) {
        console.error("Falha na verificação de autenticação:", err);
        handleLogout(false);
      } finally {
        setAuthStatus('checked');
      }
    };
    initializeApp();
  }, []);

  // --- Handlers de Ações ---
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  const handleLogout = (performApiCall = true) => {
    if (performApiCall) {
      fetch(`/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(console.error);
    }
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    
    // <<< MUDANÇA: Limpando o lobby ativo do localStorage >>>
    localStorage.removeItem(ACTIVE_LOBBY_KEY);

    setIsAuthenticated(false);
    setActiveLobby(null);
    setShowLogin(false);
  };

  const handleEnterLobby = (lobbyId: string, difficulty: Difficulty) => {
    const lobbyData: ActiveLobby = { id: lobbyId, difficulty };
    
    // <<< MUDANÇA: Salvando o lobby ativo no localStorage >>>
    localStorage.setItem(ACTIVE_LOBBY_KEY, JSON.stringify(lobbyData));
    setActiveLobby(lobbyData);
  };

  const handleExitLobby = () => {
    // <<< MUDANÇA: Removendo o lobby ativo do localStorage >>>
    localStorage.removeItem(ACTIVE_LOBBY_KEY);
    setActiveLobby(null);
  };

  // --- Derivação de Variáveis ---
  const gameWsUrl = activeLobby
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/game/${activeLobby.id}`
    : null;

  // --- Lógica de Renderização ---

  // 1. Bloqueador de múltiplas abas
  if (sessionState === 'BLOCKED') {
    return <MultiTabBlocker />;
  }
  
  // 2. Tela de carregamento inicial
  if (authStatus === 'checking' || sessionState === 'CHECKING') {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-300 h-12 w-12"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
    );
  }

  // 3. Renderização principal baseada no estado
  return (
    <WebSocketProvider url={gameWsUrl}>
      {!isAuthenticated ? (
        // Se não estiver autenticado, mostra Landing Page ou AuthForm
        showLogin ? (
          <AuthForm onLogin={handleLoginSuccess} goBack={() => setShowLogin(false)} />
        ) : (
          <LandingPage onStart={() => setShowLogin(true)} />
        )
      ) : activeLobby ? (
        // Se estiver autenticado E em um lobby, mostra a tela do jogo
        <GameScreen 
          difficulty={activeLobby.difficulty} 
          onExit={handleExitLobby}
          lobbyId={activeLobby.id}
          userId={localStorage.getItem("userId") || ""}
          username={localStorage.getItem("username") || ""}
        />
      ) : (
        // Se estiver autenticado mas NÃO em um lobby, mostra o Dashboard
        <Dashboard 
          onLogout={handleLogout}
          onEnterLobby={handleEnterLobby}
          onBackToLanding={() => setShowLogin(false)}
        />
      )}
    </WebSocketProvider>
  );
}

export default App;