import { useState } from "react";
import AuthForm from "./components/Auth/AuthForm";
import Dashboard from "./components/Dashboard/Dashboard";
import GameScreen from "./components/Game/GameScreen";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "game">(
    "dashboard"
  );

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen("dashboard");
  };

  const handleEnterGame = () => {
    setCurrentScreen("game");
  };

  const handleExitGame = () => {
    setCurrentScreen("dashboard");
  };

  if (!isAuthenticated) {
    return <AuthForm onLogin={handleLogin} />;
  }

  if (currentScreen === "game") {
    return <GameScreen difficulty="normal" onExit={handleExitGame} />;
  }

  return <Dashboard onLogout={handleLogout} onEnterLobby={handleEnterGame} />;
}

export default App;
