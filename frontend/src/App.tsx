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
        // 1. Primeiro, autentica para saber QUEM é o usuário
        const authRes = await fetch(`/api/auth/me`, { credentials: 'include' });

        if (authRes.ok) {
          const userData = await authRes.json();
          localStorage.setItem("userId", userData.id);
          localStorage.setItem("username", userData.username);
          setIsAuthenticated(true);

          // <<< MUDANÇA PRINCIPAL AQUI >>>
          // 2. Se autenticado, pergunta ao SERVIDOR onde o usuário deveria estar.
          console.log("[App] Usuário autenticado. Verificando estado da sessão no servidor...");
          const sessionRes = await fetch(`/api/session/state`, { credentials: 'include' });
          
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            // Se o servidor retornar um lobby ativo, atualizamos nosso estado.
            if (sessionData.activeLobby) {
              console.log("[App] Servidor informou lobby ativo. Restaurando sessão para:", sessionData.activeLobby);
              setActiveLobby(sessionData.activeLobby);
            } else {
              console.log("[App] Servidor informou que não há lobby ativo.");
            }
          }
        } else {
          // Se a autenticação falhar, limpa tudo.
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

  // --- Handlers de Ações ---
  const handleLoginSuccess = () => {
    // Após o login, a página vai recarregar ou a lógica de inicialização
    // vai rodar novamente, então só precisamos atualizar o estado de autenticação.
    // Para forçar a verificação de sessão, podemos simplesmente recarregar.
    window.location.reload();
  };
  
  // <<< MUDANÇA >>>
  // O handleLogout continua importante para limpar o estado LOCAL do React.
  const handleLogout = (performApiCall = true) => {
    if (performApiCall) {
      // O backend DEVE limpar o `current_lobby_code` do usuário na rota de logout.
      // Se não fizer, adicione essa lógica lá.
      fetch(`/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(console.error);
    }
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    // Não precisamos mais mexer em chaves de lobby no localStorage/sessionStorage.
    setIsAuthenticated(false);
    setActiveLobby(null);
    setShowLogin(false);
  };
  
  // <<< MUDANÇA >>>
  // Esta função agora é muito mais simples. Ela apenas atualiza o estado do React
  // para mudar a tela. O backend já foi notificado pelo WebSocket e já atualizou o DB.
  const handleEnterLobby = (lobbyId: string, difficulty: Difficulty) => {
    console.log(`[App] Entrando no lobby ${lobbyId}. Atualizando estado da UI.`);
    setActiveLobby({ id: lobbyId, difficulty });
  };
  
  // <<< MUDANÇA >>>
  // Esta função também fica mais simples. Apenas limpa o estado do React.
  const handleExitLobby = () => {
    console.log("[App] Saindo do lobby. Limpando estado da UI.");
    setActiveLobby(null);
  };

  // --- Derivação de Variáveis (sem mudança aqui) ---
  const gameWsUrl = activeLobby
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/game/${activeLobby.id}`
    : null;

  // --- Lógica de Renderização (sem mudança aqui) ---
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
          onBackToLanding={() => setShowLogin(false)}
        />
      )}
    </WebSocketProvider>
  );
}

export default App;