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
  const [corTimeA, setCorTimeA] = useState<string>("bg-blue-500");
  const [corTimeB, setCorTimeB] = useState<string>("bg-red-500");
  const [showTeamA, setShowTeamA] = useState(false);
  const [showTeamB, setShowTeamB] = useState(false);
  const [meuTime, setMeuTime] = useState<"A" | "B" | null>(null);

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
    const totalTimeComeca = difficulty === "fácil" ? 6 : 8;
    const totalTimeSegundo = difficulty === "fácil" ? 5 : 7;
    const totalPretas = difficulty === "difícil" ? 4 : difficulty === "HARDCORE" ? 8 : 1;
    const totalNeutras = totalCartas - totalTimeComeca - totalTimeSegundo - totalPretas;

    const timeQueComeca = Math.random() < 0.5 ? "A" : "B";
    const corA = timeQueComeca === "A" ? "bg-blue-500" : "bg-red-500";
    const corB = timeQueComeca === "B" ? "bg-blue-500" : "bg-red-500";

    setCorTimeA(corA);
    setCorTimeB(corB);

    const cores = [
      ...Array(totalTimeComeca).fill(timeQueComeca === "A" ? corA : corB),
      ...Array(totalTimeSegundo).fill(timeQueComeca === "A" ? corB : corA),
      ...Array(totalPretas).fill("bg-black"),
      ...Array(totalNeutras).fill("bg-yellow-100"),
    ];

    setCoresCartas(embaralhar(cores));
  };

  const handleStartGame = () => {
    gerarPalavras();
    gerarCoresCartas();
    setGameStarted(true);
  };

  return (
    <div className="h-screen flex flex-col p-4 bg-gray-100">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        {!gameStarted && (
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={handleStartGame} className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">Iniciar Jogo</button>
            <p className="text-gray-600">Aguarde todos confirmarem</p>
          </div>
        )}
        <button onClick={onExit} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Sair do Jogo</button>
      </div>

      <div className="flex flex-col lg:flex-row justify-evenly mb-4 min-h-[360px] relative">
        <div className="flex justify-between mb-4 lg:hidden">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg" onClick={() => setShowTeamA(!showTeamA)}>Ver Time A</button>
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg" onClick={() => setShowTeamB(!showTeamB)}>Ver Time B</button>
        </div>

        {showTeamA && (
          <div className="absolute top-20 left-4 bg-white shadow-lg p-4 rounded-lg z-50 w-48 space-y-2">
            <h2 className={`text-xl font-bold ${corTimeA} text-white px-2 py-1 rounded`}>Time A</h2>
            <hr />
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg w-full" onClick={() => setMeuTime("A")}>Entrar no Time A</button>
            {meuTime === "A" && <p className="text-green-600 font-semibold mt-2 text-center">Você está no Time A</p>}
          </div>
        )}

        {showTeamB && (
          <div className="absolute top-20 right-4 bg-white shadow-lg p-4 rounded-lg z-50 w-48 space-y-2">
            <h2 className={`text-xl font-bold ${corTimeB} text-white px-2 py-1 rounded`}>Time B</h2>
            <hr />
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg w-full" onClick={() => setMeuTime("B")}>Entrar no Time B</button>
            {meuTime === "B" && <p className="text-red-600 font-semibold mt-2 text-center">Você está no Time B</p>}
          </div>
        )}

        <div className="hidden lg:block w-1/5 p-4 bg-white rounded-lg shadow space-y-2">
          <h2 className={`text-xl font-bold ${corTimeA} text-white px-2 py-1 rounded`}>Time A</h2>
          <hr />
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg w-full" onClick={() => setMeuTime("A")}>Entrar no Time A</button>
          {meuTime === "A" && <p className="text-green-600 font-semibold mt-2 text-center">Você está no Time A</p>}
        </div>

        <div className="grid gap-2 grid-cols-5 mx-auto">
          {gameStarted ? (
            palavrasTabuleiro.map((palavra, idx) => {
              const corCarta = coresCartas[idx];
              const textoBranco = corCarta === "bg-black" ? "text-white" : "text-black";
              return (
                <div key={idx} className={`w-16 h-12 md:w-28 md:h-20 rounded-lg shadow flex items-center justify-center text-center text-xs md:text-sm cursor-pointer p-1 ${corCarta} ${textoBranco}`} style={{ wordBreak: "break-word" }}>
                  <span className="break-words leading-tight">{palavra}</span>
                </div>
              );
            })
          ) : (
            Array.from({ length: boardSize * boardSize }).map((_, idx) => (
              <div key={idx} className="w-16 h-12 md:w-28 md:h-20 bg-gray-200 rounded-lg shadow flex items-center justify-center text-center text-xs md:text-sm" />
            ))
          )}
        </div>

        <div className="hidden lg:block w-1/5 p-4 bg-white rounded-lg shadow space-y-2">
          <h2 className={`text-xl font-bold ${corTimeB} text-white px-2 py-1 rounded`}>Time B</h2>
          <hr />
          <button className="px-4 py-2 bg-red-500 text-white rounded-lg w-full" onClick={() => setMeuTime("B")}>Entrar no Time B</button>
          {meuTime === "B" && <p className="text-red-600 font-semibold mt-2 text-center">Você está no Time B</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-lg shadow min-h-0">
        <h2 className="text-lg font-bold pt-4 px-4">Chat do Jogo</h2>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Chat lobbyId={lobbyId} userId={userId} username={username} />
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
