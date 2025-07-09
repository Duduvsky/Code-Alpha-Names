// src/App.tsx

import { useState, useEffect } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";
import { WebSocketProvider } from "./context/WebSocketContext";

type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface ActiveLobby {
  id: string;
  difficulty: Difficulty;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game">("dashboard");
  const [selectedLobby, setSelectedLobby] = useState<ActiveLobby | null>(null);
  const [gameWsUrl, setGameWsUrl] = useState<string | null>(null);

  useEffect(() => {
    // Função para verificar se o usuário já está autenticado
    const checkAuth = async () => {
      try {
        const res = await fetch(`/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("userId", data.id);
          localStorage.setItem("username", data.username);
          setIsAuthenticated(true);
        } else {
          handleLogout(false); // Chama o logout sem fazer request de API
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
    
    // ===================================================================
    // == 1. RESTAURAR ESTADO AO CARREGAR A PÁGINA
    // ===================================================================
    // Esta parte verifica se o usuário estava em um lobby antes de recarregar.
    const savedLobby = sessionStorage.getItem('activeLobby');
    if (savedLobby) {
      try {
        const lobbyData: ActiveLobby = JSON.parse(savedLobby);
        // Se encontramos dados salvos, restauramos o estado do jogo.
        // Chamamos a mesma função de entrar no jogo para manter a lógica centralizada.
        handleEnterGame(lobbyData.id, lobbyData.difficulty, true);
      } catch (error) {
        console.error("Erro ao restaurar lobby salvo:", error);
        sessionStorage.removeItem('activeLobby'); // Limpa dados inválidos
      }
    }

  }, []); // O array vazio [] garante que isso só rode uma vez, quando o App monta.

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async (performApiCall = true) => {
    if (performApiCall) {
      try {
        await fetch(`/api/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch(error) {
        console.error("Erro na chamada de logout da API, limpando o estado localmente.", error);
      }
    }
    // Limpeza completa do estado
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    sessionStorage.removeItem('activeLobby'); // Limpa o lobby salvo
    setIsAuthenticated(false);
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
    setGameWsUrl(null);
  };

  // ===================================================================
  // == 2. SALVAR ESTADO AO ENTRAR EM UM LOBBY
  // ===================================================================
  const handleEnterGame = (lobbyId: string, difficulty: Difficulty, isRestoring = false) => {
    const lobbyData: ActiveLobby = { id: lobbyId, difficulty };
    
    // Salva os dados do lobby no sessionStorage para sobreviver ao reload
    if (!isRestoring) { // Só salva se não estiver restaurando, para evitar redundância
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

  // ===================================================================
  // == 3. LIMPAR ESTADO AO SAIR DO LOBBY
  // ===================================================================
  const handleExitGame = () => {
    // Limpa o estado salvo para não voltar para o jogo ao recarregar
    sessionStorage.removeItem('activeLobby');
    
    setCurrentScreen("dashboard");
    setSelectedLobby(null);
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
    <WebSocketProvider url={gameWsUrl}>
      {renderContent()}
    </WebSocketProvider>
  );
}

export default App;