import { useState } from "react";
import palavrasData from "../../assets/palavras_jogo.json";
import Chat from "../Chat/Chat";

interface GameScreenProps {
  difficulty: "fácil" | "normal" | "difícil" | "HARDCORE";
  onExit: () => void;
  lobbyId: string;
  userId: string;
  username: string;
}

const GameScreen = ({ difficulty, onExit, lobbyId, userId, username }: GameScreenProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [palavrasTabuleiro, setPalavrasTabuleiro] = useState<string[]>([]);
  const [coresCartas, setCoresCartas] = useState<string[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<"log" | "chat">("log");
  const [showTeamA, setShowTeamA] = useState(false);
  const [showTeamB, setShowTeamB] = useState(false);

  const timeA = { agentes: ["Jogador 1"], espiaoMestre: "Jogador 3" };
  const timeB = { agentes: ["Jogador 4"], espiaoMestre: "" };

  const getBoardSize = () => (difficulty === "fácil" ? 4 : 5);
  const boardSize = getBoardSize();

  const embaralhar = (array: string[]) => {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  const gerarPalavras = () => {
    const totalCartas = boardSize * boardSize;
    setPalavrasTabuleiro(embaralhar(palavrasData.palavras).slice(0, totalCartas));
  };

  const gerarCoresCartas = () => {
    const totalCartas = boardSize * boardSize;
    const cores = [
      ...Array(8).fill("bg-blue-500"),
      ...Array(7).fill("bg-red-500"),
      ...Array(1).fill("bg-black"),
      ...Array(totalCartas - 16).fill("bg-yellow-100"),
    ];
    setCoresCartas(embaralhar(cores));
  };

  const handleStartGame = () => {
    gerarPalavras();
    gerarCoresCartas();
    setGameStarted(true);
  };

  return (
    <div className="h-screen flex flex-col p-2 md:p-4 bg-gray-100 overflow-hidden">
      
      {/* Topo */}
      <div className="flex justify-between items-center pb-2 md:pb-4">
        <div className="text-lg font-bold">Jogadores: 4</div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-200 rounded font-semibold">{username}</span>
          <button onClick={handleStartGame} className="px-3 py-1 bg-green-500 text-white rounded">Iniciar</button>
          <button onClick={onExit} className="px-3 py-1 bg-red-500 text-white rounded">Sair</button>
        </div>
      </div>

      {/* Corpo Principal */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4">
        
        {/* Times Mobile */}
        <div className="mt-2 md:hidden flex gap-2 mb-2">
          <div className="flex-1 relative">
            <button onClick={() => setShowTeamA(!showTeamA)} className="w-full bg-blue-500 text-white py-2 rounded">Time A</button>
            {showTeamA && (
              <div className="absolute z-10 bg-white shadow rounded mt-1 p-2 w-full text-xs space-y-1">
                <div>Agentes: {timeA.agentes.join(", ")}</div>
                <div>Espião mestre: {timeA.espiaoMestre || "Vago"}</div>
                { !timeA.espiaoMestre && <button className="mt-1 w-full text-xs bg-blue-500 text-white py-1 rounded">Entrar como Espião</button>}
                <button className="mt-1 w-full text-xs bg-blue-500 text-white py-1 rounded">Entrar como Agente</button>
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <button onClick={() => setShowTeamB(!showTeamB)} className="w-full bg-red-500 text-white py-2 rounded">Time B</button>
            {showTeamB && (
              <div className="absolute z-10 bg-white shadow rounded mt-1 p-2 w-full text-xs space-y-1">
                <div>Agentes: {timeB.agentes.join(", ")}</div>
                <div>Espião mestre: {timeB.espiaoMestre || "Vago"}</div>
                { !timeB.espiaoMestre && <button className="mt-1 w-full text-xs bg-red-500 text-white py-1 rounded">Entrar como Espião</button>}
                <button className="mt-1 w-full text-xs bg-red-500 text-white py-1 rounded">Entrar como Agente</button>
              </div>
            )}
          </div>
        </div>

        {/* Times Desktop */}
        <div className="hidden md:flex flex-col gap-4 w-1/5 min-h-0">
          {[{time: timeA, cor: "blue"}, {time: timeB, cor: "red"}].map(({time, cor}, idx) => (
            <div key={idx} className="flex flex-col bg-white rounded shadow p-2 space-y-2">
              <div className={`flex justify-between items-center font-bold text-${cor}-500`}>
                <span>Time {cor.toUpperCase().charAt(0)} ({cor === "blue" ? 9 : 8})</span>
                <button className={`text-xs bg-${cor}-500 text-white px-2 py-1 rounded`}>Entrar</button>
              </div>
              <div className="text-xs">Agentes:</div>
              {time.agentes.map((jogador, idx) => (
                <span key={idx} className="text-xs bg-gray-200 px-2 py-1 rounded mb-1">{jogador}</span>
              ))}
              <div className="text-xs mt-1">
                Espião mestre: {time.espiaoMestre || "Vago"} 
                { !time.espiaoMestre && <button className={`ml-2 text-xs bg-${cor}-500 text-white px-2 py-1 rounded`}>Entrar</button>}
              </div>
            </div>
          ))}
        </div>

        {/* Tabuleiro */}
        <div className="flex-1 min-h-0 flex flex-col items-center">
          <div className="grid grid-cols-5 gap-3 mx-auto rounded-lg">
            {gameStarted ? palavrasTabuleiro.map((palavra, idx) => (
              <div key={idx} style={{ wordBreak: "break-word" }} className={`
                w-17 h-10 md:w-30 md:h-18 rounded-md
                flex items-center justify-center
                ${coresCartas[idx] ? `${coresCartas[idx]} bg-opacity-30` : "bg-white"}
                p-0.5 md:p-1.5
                
              `}>
                <div className={`
                  w-full h-full rounded-sm text-[10px]
                  border-2 ${coresCartas[idx] ? "border-dashed border-black-100" : "border-solid border-gray-300"}
                  flex items-center justify-center
                  ${coresCartas[idx]?.includes('bg-red') || coresCartas[idx]?.includes('bg-black') ? 'text-white' : 'text-black'}
                  text-sm md:text-base font-medium text-center
                `}>
                  {palavra.split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))}
                </div>
              </div>
            )) : Array.from({ length: boardSize * boardSize }).map((_, idx) => (
              <div key={idx} className="w-17 h-10 md:w-30 md:h-18 rounded-md bg-gray-100 flex items-center justify-center p-2.5">
                <div className="w-full h-full rounded-sm border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500">?</div>
              </div>
            ))}
          </div>

          {/* Dica */}
          <div className="flex justify-center gap-3 mt-3 md:mt-1 flex-wrap items-center bg-white p-3 rounded-lg shadow-sm">
            <span className="font-medium">Dica:</span> 
            <input type="text" placeholder="Palavra..." className="p-2 border rounded w-32 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <span className="font-medium">Quantas cartas:</span> 
            <input type="number" min={1} className="p-2 border rounded w-16 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow">Enviar</button>
          </div>
        </div>

        {/* Log - Desktop */}
        <div className="hidden md:flex flex-col w-1/5 min-h-0">
          <div className="bg-white rounded shadow p-2 flex-1 flex flex-col">
            <div className="font-bold mb-2">Log do Jogo</div>
            <div className="flex-1 bg-gray-100 rounded p-2 overflow-y-auto text-sm">{/* Conteúdo Log */}</div>
          </div>
        </div>
      </div>

      {/* Tabs Mobile - Versão Compacta */}
      <div className="md:hidden flex flex-col mt-2" style={{ height: '30vh' }}> {/* Ajuste a altura conforme necessário */}
        {/* Botões das Tabs - Compactos */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 p-2 text-xs font-medium ${
              activeMobileTab === "log"
                ? "text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveMobileTab("log")}
          >
            Log
          </button>
          <button
            className={`flex-1 p-2 text-xs font-medium ${
              activeMobileTab === "chat"
                ? "text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveMobileTab("chat")}
          >
            Chat
          </button>
        </div>

        {/* Conteúdo das Tabs - Compacto */}
        <div className="flex-1 bg-white rounded-b-lg shadow-sm overflow-hidden">
          <div className={`h-full ${activeMobileTab !== "log" ? "hidden" : ""} overflow-y-auto text-xs p-1`}>
            {/* Conteúdo do Log compacto */}
            <div className="space-y-1">
              <div className="text-gray-600">Jogo iniciado</div>
              <div className="text-gray-600">Time Azul: "animal" (2)</div>
              {/* Outras mensagens do log */}
            </div>
          </div>
          <div className={`h-full ${activeMobileTab !== "chat" ? "hidden" : ""}`}>
            <Chat 
              lobbyId={lobbyId} 
              userId={userId} 
              username={username}
            />
          </div>
        </div>
      </div>

      {/* Chat Desktop */}
      <div className="hidden md:block mt-4">
        <div className="bg-white rounded shadow p-2 flex flex-col h-54">
          <div className="font-bold mb-2">Chat do Jogo</div>
          <div className="flex-1 overflow-hidden">
            <Chat lobbyId={lobbyId} userId={userId} username={username} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
