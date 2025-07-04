import { useState, useEffect, useRef } from "react";
import Chat from "../Chat/Chat";
import type { GameState, Team, PlayerRole, CardState } from "../../types/game";
import { useWebSocket } from '../../hooks/useWebSocket';

import timeA from '../../../public/Codenames BlueTeam - Spyfamily 1.png'
import timeB from '../../../public/Codenames AnyBond RedTeam - SpyFamily 1.png'
import imgBG from '../../../public/Codenames BG.png'

interface GameScreenProps {
  difficulty: "fácil" | "normal" | "difícil" | "HARDCORE";
  onExit: () => void;
  lobbyId: string;
  userId: string;
  username: string;
}

const GameScreen = ({ onExit, lobbyId, userId, username }: GameScreenProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [clueWord, setClueWord] = useState("");
  const [clueCount, setClueCount] = useState(1);
  const [activeMobileTab, setActiveMobileTab] = useState<"log" | "chat">("log");

  const { ws, isConnected, sendMessage } = useWebSocket();
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!isConnected || !ws) {
      setGameState(null); 
      hasJoined.current = false;
      return;
    }

    if (isConnected && !hasJoined.current) {
      sendMessage('JOIN_GAME', { userId, username });
      hasJoined.current = true;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'GAME_STATE_UPDATE') {
          setGameState(message.payload);
        } else if (message.type === 'ERROR') {
          alert(`Erro do servidor: ${message.payload.error}`);
        }
      } catch (error) {
        console.error("Erro ao processar mensagem do servidor:", error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [isConnected, ws, userId, username, sendMessage]);

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

  if (!isConnected || !gameState) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100 text-xl font-semibold">
        <p>Conectando ao lobby {lobbyId}...</p>
        {!isConnected && <p className="text-sm text-gray-500 mt-2">Aguardando conexão com o servidor...</p>}
        {isConnected && !gameState && <p className="text-sm text-gray-500 mt-2">Conectado! Carregando estado do jogo...</p>}
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

  const getCardBgColor = (color: CardState['color']) => {
    if (color === 'blue') return 'bg-blue-500 text-white';
    if (color === 'red') return 'bg-red-500 text-white';
    if (color === 'assassin') return 'bg-black text-white';
    if (color === 'neutral') return 'bg-yellow-100 text-black';
    return 'bg-white text-black';
  };
  
  return (
    <div className="h-screen flex flex-col p-2 md:p-4 overflow-hidden">

      <div className="absolute inset-0 -z-10">
        <img 
          src= {imgBG}
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-opacity-30"></div> {/* Overlay escuro */}
      </div>
      
      {/* Topo */}
      <div className="flex justify-between items-center pb-2 md:pb-4">
        <div className="text-lg font-bold">Jogadores: {gameState.players.length}</div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-200 rounded font-semibold">{username}</span>
          {gameState.gamePhase === 'waiting' && me?.id === gameState.players[0]?.id && <button onClick={handleStartGame} className="px-3 py-1 bg-green-500 text-white rounded">Iniciar</button>}
          <button onClick={onExit} className="px-3 py-1 bg-red-500 text-white rounded">Sair</button>
        </div>
      </div>

      {/* Corpo Principal */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
        
        {/* Times */}
        <div className="hidden md:flex flex-col gap-4 w-1/5 min-h-0">
            {[
                { team: 'A', name: 'Azul', color: 'blue', score: gameState.scores.A, spymaster: spymasterA, agents: teamA.filter(p=>p.role==='operative'), image: timeA },
                { team: 'B', name: 'Vermelho', color: 'red', score: gameState.scores.B, spymaster: spymasterB, agents: teamB.filter(p=>p.role==='operative'), image: timeB }
            ].map(t => (
                <div key={t.team} className="flex flex-col bg-white rounded shadow p-2 space-y-2">
                    {/* Imagem do time - adicionada aqui */}
                    <div className="flex h-[100px] justify-center overflow-hidden">
                      <img 
                          src={t.image} 
                          alt={`Time ${t.name}`} 
                          className="w-full h-full object-cover"
                          style={{ objectPosition: '0px -50px' }} /* Ajuste este valor para cima/baixo */
                      />
                    </div>
                    <div className={`flex justify-between items-center font-bold text-${t.color}-500`}>
                        <span>Time {t.name} (Faltam: {t.score})</span>
                    </div>
                    <div className="text-xs">Espião: {t.spymaster?.username || 'Vago'}</div>
                    <div className="flex items-center gap-1 text-xs">
                        <span className="whitespace-nowrap">Agentes:</span>
                        <div className="flex flex-wrap gap-1">
                            {t.agents.map(p => (
                                <span key={p.id} className="bg-gray-200 px-2 py-0.5 rounded whitespace-nowrap">
                                    {p.username}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-center align-center">
                      {!t.spymaster && gameState.gamePhase === 'waiting' && <button onClick={() => handleJoinTeam(t.team as Team, 'spymaster')} className={`text-xs bg-${t.color}-500 text-white px-2 py-1 rounded`}>Ser Espião</button>}
                      {gameState.gamePhase === 'waiting' && <button onClick={() => handleJoinTeam(t.team as Team, 'operative')} className={`text-xs bg-${t.color}-500 text-white px-2 py-1 rounded`}>Ser Agente</button>}
                    </div>
                </div>
            ))}
        </div>

        {/* Tabuleiro */}
        <div className="flex-1 min-h-0 flex flex-col items-center">
            <div className="text-center font-bold mb-2 text-lg">
                {gameState.gamePhase === 'ended' ? `FIM DE JOGO! Time ${gameState.winner === 'A' ? 'Azul' : 'Vermelho'} venceu!` : `Turno: Time ${gameState.currentTurn === 'A' ? 'Azul' : 'Vermelho'}`}
            </div>
            <div className="grid grid-cols-5 gap-3 mx-auto rounded-lg">
              {gameState.board.map((card) => {
                  const bgColorClass = getCardBgColor(card.color);
                  const cardStyle = card.revealed 
                      ? `shadow-inner brightness-75 ${bgColorClass} p-0.5 md:p-1.5`
                      : isSpymaster
                          ? `p-0.5 md:p-1.5 ${bgColorClass} bg-opacity-30`
                          : 'bg-white hover:bg-gray-100 p-0.5 md:p-1.5';
                  
                  const innerCardStyle = card.revealed
                      ? 'w-full h-full rounded-sm'
                      : isSpymaster
                          ? 'w-full h-full rounded-sm border-2 border-dashed border-black border-opacity-30'
                          : 'w-full h-full rounded-sm border-2 border-solid border-gray-300';

                  const textColorClass = !card.revealed && isSpymaster && (card.color === 'blue' || card.color === 'red' || card.color === 'assassin') 
                      ? 'text-white' 
                      : 'text-black';

                  return (
                      <button 
                          key={card.word} 
                          disabled={!isMyTurnToGuess || card.revealed} 
                          onClick={() => handleMakeGuess(card.word)} 
                          className={`rounded-md flex items-center justify-center transition-all duration-200 ${cardStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                          <div className={`${innerCardStyle} flex items-center justify-center`}>
                              <div style={{ wordBreak: "break-word" }} className={`w-17 h-10 text-xs md:text-lg md:w-30 md:h-14 rounded-md flex items-center justify-center p-1 transition-all duration-200 ${cardStyle} ${textColorClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                  {card.word.split(' ').map((word, i) => (
                                      <span key={i} className="block">{word}</span>
                                  ))}
                              </div>
                          </div>
                      </button>
                  );
              })}
          </div>

            {/* Dica / Input da Dica */}
            {isMyTurnToGiveClue ? (
                <div className="flex justify-center gap-2 mt-2 flex-wrap items-center bg-white p-3 rounded-lg shadow-sm">
                    <span className="font-medium">Sua vez de dar a dica:</span> 
                    <input type="text" value={clueWord} onChange={e => setClueWord(e.target.value)} placeholder="Palavra..." className="p-2 border rounded w-32"/>
                    <input type="number" value={clueCount} onChange={e => setClueCount(Number(e.target.value))} min={1} className="p-2 border rounded w-16"/>
                    <button onClick={handleGiveClue} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enviar Dica</button>
                </div>
            ) : gameState.currentClue ? (
                 <div className="mt-3 bg-yellow-200 p-3 rounded-lg shadow-sm text-center">
                    Dica do Time {gameState.currentTurn === 'A' ? 'Azul' : 'Vermelho'}: <span className="font-bold">{gameState.currentClue.word}</span> ({gameState.currentClue.count})
                    {isMyTurnToGuess && <span className="block text-sm">Sua vez de adivinhar!</span>}
                 </div>
            ) : gameState.gamePhase !== 'ended' ? (
                <div className="mt-3 bg-gray-200 p-3 rounded-lg shadow-sm text-center">
                    Aguardando dica do espião do time {gameState.currentTurn === 'A' ? 'Azul' : 'Vermelho'}...
                </div>
            ) : null}
        </div>

        {/* Log (Desktop) */}
        <div className="hidden md:flex flex-col w-1/5 min-h-0 gap-4">
            <div className="bg-white rounded shadow p-2 flex-1 flex flex-col min-h-[20vh]" style={{ height: '20vh' }}>
                <div className="font-bold mb-2">Log do Jogo</div>
                <div className="flex-1 bg-gray-100 rounded p-2 overflow-y-auto text-sm space-y-1">
                    {(gameState.log || []).map((entry, i) => <div key={i}>{entry}</div>)}
                </div>
            </div>
        </div>
      </div>

      {/* Altura do Chat ajustada aqui */}
      <div className="hidden md:flex bg-white rounded shadow p-2 flex flex-col mt-10" style={{ height: '230px' }}>
          <div className="font-bold mb-2">Chat do Jogo</div>
          <div className="flex-1 overflow-hidden">
              <Chat lobbyId={lobbyId} userId={userId} username={username} />
          </div>
      </div>
      
      {/* Tabs Mobile */}
      <div className="md:hidden flex flex-col mt-2" style={{ height: '40vh' }}> {/* Altura ajustada */}
        <div className="flex border-b border-gray-200">
          <button className={`flex-1 p-2 text-xs font-medium ${activeMobileTab === "log" ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-500"}`} onClick={() => setActiveMobileTab("log")}>Log</button>
          <button className={`flex-1 p-2 text-xs font-medium ${activeMobileTab === "chat" ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-500"}`} onClick={() => setActiveMobileTab("chat")}>Chat</button>
        </div>
        <div className="flex-1 bg-white rounded-b-lg shadow-sm overflow-hidden">
          <div className={`h-full ${activeMobileTab !== "log" ? "hidden" : ""} overflow-y-auto text-xs p-1 space-y-1`}>
            {(gameState.log || []).map((entry, i) => <div key={i}>{entry}</div>)}
          </div>
          <div className={`h-full ${activeMobileTab !== "chat" ? "hidden" : ""}`}>
            <Chat lobbyId={lobbyId} userId={userId} username={username}/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;