import { useState, useEffect, useRef } from "react";
import Chat from "../Chat/Chat";
import type { GameState, Team, PlayerRole } from "../../types/game";
import { useWebSocket } from '../../hooks/useWebSocket';
import { ClockIcon, ForwardIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

import timeA from '../../../public/Codenames BlueTeam - Spyfamily 1.png'
import timeB from '../../../public/Codenames AnyBond RedTeam - SpyFamily 1.png'
import imgBG from '../../../public/Codenames BG.png'
import { useNotification } from "../Modal/useNotification";

interface GameScreenProps {
  difficulty: "Fácil" | "Normal" | "Difícil" | "HARDCORE";
  onExit: () => void;
  lobbyId: string;
  userId: string;
  username: string;
}

const formatTime = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const GameScreen = ({ onExit, lobbyId, userId, username }: GameScreenProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [clueWord, setClueWord] = useState("");
  const [clueCount, setClueCount] = useState(1);
  const [activeMobileTab, setActiveMobileTab] = useState<"log" | "chat">("log");
  const { notify } = useNotification();

  const { ws, isConnected, sendMessage } = useWebSocket();
  const joinedWsRef = useRef<WebSocket | null>(null);

  const [displayTime, setDisplayTime] = useState<number | null>(null);
  const localTimerRef = useRef<number | null>(null);
  const logEndRefDesktop = useRef<HTMLDivElement>(null);
  const logEndRefMobile = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      logEndRefDesktop.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      logEndRefMobile.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [gameState?.log?.length]);

  useEffect(() => {
    if (!isConnected || !ws) {
      setGameState(null);
      return;
    }
    if (ws !== joinedWsRef.current) {
      console.log("[GameScreen] Nova conexão WebSocket detectada. Enviando JOIN_GAME...");
      sendMessage('JOIN_GAME', { userId, username });
      joinedWsRef.current = ws;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'GAME_STATE_UPDATE':
            setGameState(message.payload);
            break;
          case 'LOBBY_CLOSED':
            notify(message.payload.reason, "info");
            onExit();
            break;
          case 'ERROR': {
            const errorMessage = message.payload.message;
            notify(`Erro: ${errorMessage}`, "error");
            if (errorMessage.includes("jogo já começou")) {
              setTimeout(() => { onExit(); }, 3000);
            }
            break;
          }
          case 'CREATOR_DISCONNECTED_WARNING':
            notify(message.payload.message, "info");
            break;
          case 'CREATOR_RECONNECTED':
            notify(message.payload.message, "success");
            break;
          case 'ESSENTIAL_ROLE_DISCONNECTED':
            notify(message.payload.message, "info");
            break;
          case 'ESSENTIAL_ROLE_RECONNECTED':
            notify(message.payload.message, "success");
            break;
          default: break;
        }
      } catch (error) {
        console.error("Erro ao processar mensagem do servidor:", error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
      joinedWsRef.current = null;
    };
  }, [isConnected, ws, userId, username, sendMessage, onExit, notify]);

  useEffect(() => {
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
    }
    setDisplayTime(gameState?.turnTimeRemaining ?? null);
    if (gameState?.turnTimeRemaining && gameState.turnTimeRemaining > 0) {
      localTimerRef.current = window.setInterval(() => {
        setDisplayTime(prevTime => (prevTime && prevTime > 0 ? prevTime - 1 : 0));
      }, 1000);
    }
    return () => {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current);
      }
    };
  }, [gameState?.turnTimeRemaining]);

  const handleStartGame = () => sendMessage('START_GAME', {});
  const handleJoinTeam = (team: Team, role: PlayerRole) => sendMessage('JOIN_TEAM', { team, role });
  const handleMakeGuess = (word: string) => sendMessage('MAKE_GUESS', { word });
  const handleGiveClue = () => {
    if (clueWord.trim() && clueCount > 0) {
      sendMessage('GIVE_CLUE', { clue: clueWord.trim(), count: clueCount });
      setClueWord("");
      setClueCount(1);
    }
  };
  const handlePassTurn = () => sendMessage('PASS_TURN', {});
  const handleLeaveTeam = () => sendMessage('LEAVE_TEAM', {});

  // Função para sair voluntariamente DURANTE o jogo
  const handleLeaveGameManually = () => {
    sendMessage('EXIT_LOBBY', {});
    onExit();
  };

  if (!isConnected || !gameState) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-800 text-white text-xl font-semibold">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        <p>Conectando ao lobby {lobbyId}...</p>
        <p className="text-sm text-gray-400 mt-2">
          {!isConnected && "Aguardando conexão com o servidor..."}
          {isConnected && !gameState && "Conectado! Aguardando estado do jogo..."}
        </p>
      </div>
    );
  }

  const me = gameState.players.find(p => p.id === userId);
  const isSpymaster = me?.role === 'spymaster';
  const teamA = gameState.players.filter(p => p.team === 'A');
  const teamB = gameState.players.filter(p => p.team === 'B');
  const spymasterA = teamA.find(p => p.role === 'spymaster');
  const spymasterB = teamB.find(p => p.role === 'spymaster');
  const isMyTurnToGiveClue = me?.role === 'spymaster' && me?.team === gameState.currentTurn && gameState.gamePhase === 'giving_clue';
  const isMyTurnToGuess = me?.role === 'operative' && me?.team === gameState.currentTurn && gameState.gamePhase === 'guessing';
  const currentTeamName = gameState.currentTurn === 'A' ? 'Azul' : 'Vermelho';

  const turnPanelClass = () => {
    if (gameState.currentTurn === 'A') return 'bg-blue-900 bg-opacity-40 border-blue-500';
    if (gameState.currentTurn === 'B') return 'bg-red-900 bg-opacity-40 border-red-500';
    return 'bg-gray-700';
  };

  return (
    <div className="h-screen flex flex-col p-2 md:p-4 overflow-hidden bg-gray-900 text-white">
      <div className="absolute inset-0 -z-10"><img src={imgBG} alt="Background" className="w-full h-full object-cover opacity-20" /></div>
      <div className="flex justify-between items-center pb-2 md:pb-4">
        <div className="text-lg font-bold">Jogadores: {gameState.players.length}</div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-700 rounded font-semibold">{username}</span>

          {gameState.gamePhase !== 'ended' && (
            <>
              {me?.team && gameState.gamePhase === 'waiting' && (
                <button
                  onClick={handleLeaveTeam}
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  title="Deixar Time e Função"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  <span>Deixar Time</span>
                </button>
              )}
              {gameState.gamePhase === 'waiting' && userId === gameState.creatorId && (
                <button onClick={handleStartGame} className="cursor-pointer px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Iniciar</button>
              )}
              <button onClick={handleLeaveGameManually} className="cursor-pointer px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Sair do Jogo</button>
            </>
          )}

          {gameState.gamePhase === 'ended' && (
            <button onClick={onExit} className="cursor-pointer px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Voltar ao Lobby</button>
          )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
        <div className="hidden md:flex flex-col gap-4 w-1/5 min-h-0">
          {[
            { team: 'A', name: 'Azul', color: 'blue', score: gameState.scores.A, spymaster: spymasterA, agents: teamA.filter(p => p.role === 'operative'), image: timeA },
            { team: 'B', name: 'Vermelho', color: 'red', score: gameState.scores.B, spymaster: spymasterB, agents: teamB.filter(p => p.role === 'operative'), image: timeB }
          ].map(t => (
            <div key={t.team} className="flex flex-col bg-gray-800 bg-opacity-70 rounded shadow p-2 space-y-2 border border-gray-700">
              <div className="flex h-[200px] justify-center overflow-hidden rounded"><img src={t.image} alt={`Time ${t.name}`} className="w-full h-full object-cover object-top" /></div>
              <div className={`flex justify-between items-center font-bold ${t.color === 'blue' ? 'text-blue-400' : 'text-red-400'
                }`}>
                <span>Time {t.name} (Faltam: {t.score})</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="whitespace-nowrap">Espião:</span>
                {t.spymaster?.username ? (
                  <span className="bg-gray-600 px-2 py-0.5 rounded whitespace-nowrap">{t.spymaster.username}</span>
                ) : (
                  <span className="text-gray-400">Vago</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="whitespace-nowrap">Agentes:</span>
                <div className="flex flex-wrap gap-1">{t.agents.map(p => (<span key={p.id} className="bg-gray-600 px-2 py-0.5 rounded whitespace-nowrap">{p.username}</span>))}</div>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                {!t.spymaster && gameState.gamePhase === 'waiting' && <button onClick={() => handleJoinTeam(t.team as Team, 'spymaster')} className={`cursor-pointer text-xs bg-${t.color}-600 text-white px-2 py-1 rounded hover:bg-${t.color}-500`}>Ser Espião</button>}
                {gameState.gamePhase === 'waiting' && <button onClick={() => handleJoinTeam(t.team as Team, 'operative')} className={`cursor-pointer text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-500`}>Ser Agente</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 min-h-0 flex flex-col items-center">
          <div className="flex justify-center items-center gap-4 font-bold mb-2 text-lg">
            <span>
              {gameState.gamePhase === 'waiting' ? ('Escolha seu time') :
                gameState.gamePhase === 'ended' ? (`FIM DE JOGO!`) :
                  (`Turno: Time ${currentTeamName}`)
              }
            </span>
            {displayTime !== null && gameState.gamePhase !== 'ended' && gameState.gamePhase !== 'waiting' && (
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-base transition-colors duration-300 ${displayTime <= 10 ? 'text-red-300 bg-red-900 bg-opacity-50 animate-pulse' : 'text-gray-300 bg-gray-700'}`}>
                <ClockIcon className="h-5 w-5" />
                <span>{formatTime(displayTime)}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2 md:gap-3 mx-auto">
            {gameState.board.map((card) => {
              const isRevealed = card.revealed;
              const canSeeColor = isSpymaster || isRevealed;
              const getBaseBg = () => { if (canSeeColor) { if (card.color === 'blue') return 'bg-blue-500'; if (card.color === 'red') return 'bg-red-500'; if (card.color === 'neutral') return 'bg-yellow-200'; if (card.color === 'assassin') return 'bg-black'; } return 'bg-white'; };
              const getTextColor = () => { if (canSeeColor && ['blue', 'red', 'assassin'].includes(card.color)) return 'text-white'; return 'text-black'; };
              const outerClasses = `cursor-pointer w-full aspect-video rounded-md p-1 transition-all duration-300 ${getBaseBg()} ${getTextColor()} ${isRevealed ? 'opacity-50 brightness-75' : 'hover:scale-105'} ${!isMyTurnToGuess || isRevealed ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSpymaster && !isRevealed ? 'border-2 border-dashed border-gray-400' : 'border border-gray-300'}`;
              return (
                <button key={card.word} disabled={!isMyTurnToGuess || isRevealed} onClick={() => handleMakeGuess(card.word)} className={outerClasses}>
                  <div className="w-full h-full flex items-center justify-center rounded-sm border border-gray-500 border-dashed px-2 py-1" style={{ wordBreak: "break-word" }}>
                    <span className="text-xs md:text-base font-bold text-center break-words leading-tight">{card.word}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 w-full max-w-lg">
            {(() => {
              if (gameState.gamePhase === 'waiting') {
                return (<div className="bg-gray-700 p-3 rounded-lg shadow-md text-center">Aguardando o host iniciar a partida...</div>);
              }
              if (gameState.gamePhase === 'ended') {
                const winnerName = gameState.winner === 'A' ? 'Azul' : 'Vermelho';
                const didIWin = me?.team === gameState.winner;
                return (
                  <div className={`p-4 rounded-lg shadow-lg text-center border-2 ${didIWin ? 'bg-green-900 bg-opacity-70 border-green-500' : 'bg-red-900 bg-opacity-70 border-red-500'}`}>
                    <h3 className="text-2xl font-bold mb-2">
                      {didIWin ? '🎉 VITÓRIA! 🎉' : 'Derrota'}
                    </h3>
                    <p className="text-lg mb-4">
                      O Time {winnerName} venceu a partida!
                    </p>
                    <button
                      onClick={onExit}
                      className="cursor-pointer px-6 py-2 bg-gray-200 text-black font-bold rounded-lg hover:bg-white transition-colors"
                    >
                      Voltar ao Lobby
                    </button>
                  </div>
                );
              }
              if (isMyTurnToGiveClue) {
                return (<div className="flex justify-center gap-2 flex-wrap items-center bg-gray-800 p-3 rounded-lg shadow-md"><span className="font-medium">Sua vez de dar a dica:</span><input type="text" value={clueWord} onChange={e => setClueWord(e.target.value)} placeholder="Dica..." className="p-2 border rounded bg-gray-700 border-gray-600 w-32" /><input type="number" value={clueCount} onChange={e => setClueCount(Number(e.target.value))} min={1} max={9} className="p-2 border rounded bg-gray-700 border-gray-600 w-16" /><button onClick={handleGiveClue} className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enviar</button></div>);
              }
              if (gameState.currentClue) {
                return (<div className={`p-3 rounded-lg shadow-md text-center space-y-2 border-2 transition-colors duration-300 ${turnPanelClass()}`}><div>Dica: <span className="font-bold">{gameState.currentClue.word} ({gameState.currentClue.count})</span><span className="text-gray-300 mx-2">|</span>Tentativas Restantes: <span className="font-bold">{gameState.guessesRemaining}</span></div>{isMyTurnToGuess ? (<div className="flex justify-center items-center gap-4"><span className="block text-sm font-semibold">Sua vez de adivinhar!</span><button onClick={handlePassTurn} className="cursor-pointer flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-500 transition-colors"><ForwardIcon className="h-4 w-4" />Passar a Vez</button></div>) : (me?.team === gameState.currentTurn ? (<span className="block text-sm">Aguardando seu time adivinhar...</span>) : (<span className="block text-sm">Aguardando o time {currentTeamName} adivinhar...</span>))}</div>);
              }
              return (<div className="bg-gray-700 p-3 rounded-lg shadow-md text-center">Aguardando dica do espião do time {currentTeamName}...</div>);
            })()}
          </div>
        </div>
        <div className="hidden md:flex flex-col w-1/5 min-h-0 gap-4">
          <div className="bg-gray-800 bg-opacity-70 border border-gray-700 rounded shadow p-2 flex-1 flex flex-col min-h-0">
            <div className="font-bold mb-2">Log do Jogo</div>
            <div style={{ height: "300px" }} className="bg-gray-900 rounded p-2 overflow-y-auto text-sm space-y-1">
              {(gameState.log || []).map((entry, i) => (
                <div key={i}>{entry}</div>
              ))}
              <div ref={logEndRefDesktop} />
            </div>
          </div>
          <div className="bg-gray-800 bg-opacity-70 border border-gray-700 rounded shadow p-2 flex flex-col min-h-0 h-[450px]">
            <div className="font-bold mb-2">Chat</div>
            <div className="flex-1 overflow-hidden">
              <Chat lobbyId={lobbyId} userId={userId} username={username} />
            </div>
          </div>
        </div>

      </div>
      <div className="md:hidden flex flex-col mt-4" style={{ height: '35vh' }}>
        <div className="flex border-b border-gray-700">
          <button
            className={`cursor-pointer flex-1 p-2 text-sm font-medium ${activeMobileTab === "log"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
              }`}
            onClick={() => setActiveMobileTab("log")}
          >
            Log
          </button>
          <button
            className={`cursor-pointer flex-1 p-2 text-sm font-medium ${activeMobileTab === "chat"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
              }`}
            onClick={() => setActiveMobileTab("chat")}
          >
            Chat
          </button>
        </div>
        <div className="flex-1 bg-gray-800 rounded-b-lg shadow-sm overflow-hidden">
          <div
            className={`h-full ${activeMobileTab !== "log" ? "hidden" : ""} overflow-y-auto text-xs p-2 space-y-1`}
          >
            {(gameState.log || []).map((entry, i) => (
              <div key={i}>{entry}</div>
            ))}
            <div ref={logEndRefMobile} />
          </div>
          <div className={`h-full ${activeMobileTab !== "chat" ? "hidden" : ""}`}>
            <Chat lobbyId={lobbyId} userId={userId} username={username} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;