import { useState } from "react";
import palavrasData from "../../assets/palavras_jogo.json";

interface GameScreenProps {
  difficulty: "fácil" | "normal" | "difícil" | "HARDCORE";
  onExit: () => void;
}

const GameScreen = ({ difficulty, onExit }: GameScreenProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [palavrasTabuleiro, setPalavrasTabuleiro] = useState<string[]>([]);
  const [coresCartas, setCoresCartas] = useState<string[]>([]);
  const [corTimeA, setCorTimeA] = useState<string>("bg-blue-500");
  const [corTimeB, setCorTimeB] = useState<string>("bg-red-500");

  const getBoardSize = () => {
    if (difficulty === "fácil") return 4;
    return 5;
  };

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
    const palavrasEmbaralhadas = embaralhar(palavrasData.palavras);
    setPalavrasTabuleiro(palavrasEmbaralhadas.slice(0, totalCartas));
  };

  const gerarCoresCartas = () => {
    const totalCartas = boardSize * boardSize;

    const totalTimeComeça = difficulty === "fácil" ? 6 : 8;
    const totalTimeSegundo = difficulty === "fácil" ? 5 : 7;
    const totalPretas =
      difficulty === "difícil" ? 4 : difficulty === "HARDCORE" ? 8 : 1;
    const totalNeutras =
      totalCartas - totalTimeComeça - totalTimeSegundo - totalPretas;

    const timeQueComeça = Math.random() < 0.5 ? "A" : "B";
    const corA = timeQueComeça === "A" ? "bg-blue-500" : "bg-red-500";
    const corB = timeQueComeça === "B" ? "bg-blue-500" : "bg-red-500";

    setCorTimeA(corA);
    setCorTimeB(corB);

    const cores = [
      ...Array(totalTimeComeça).fill(timeQueComeça === "A" ? corA : corB),
      ...Array(totalTimeSegundo).fill(timeQueComeça === "A" ? corB : corA),
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
    <div className="min-h-screen flex flex-col p-4 bg-gray-100">
      {/* Área de Decisões */}
      <div className="flex justify-between items-center mb-4">
        {!gameStarted && (
          <div className="flex items-center gap-8">
            <button
              onClick={handleStartGame}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Iniciar Jogo
            </button>
            <p className="text-gray-600">Aguarde todos confirmarem</p>
          </div>
        )}
        <button
          onClick={onExit}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Sair do Jogo
        </button>
      </div>

      {/* Área do Tabuleiro + Times */}
      <div className="flex justify-evenly mb-4 min-h-[360px]">
        {/* Time A */}
        <div className="w-1/5 p-4 bg-white rounded-lg shadow">
          <h2 className={`text-xl font-bold mb-2 ${corTimeA}`}>
            Time A
          </h2>
          <p className="text-gray-700 mb-2">Espião Mestre: Jogador 1</p>
          <ul className="space-y-1 text-gray-600">
            <li>Jogador 2</li>
            <li>Jogador 3</li>
          </ul>
        </div>

        {/* Tabuleiro ou placeholder */}
        <div
        className={`grid gap-2 ${
            boardSize === 4 ? "grid-cols-4" : "grid-cols-5"
        }`}
        >
        {gameStarted ? (
            palavrasTabuleiro.map((palavra, idx) => {
            const corCarta = coresCartas[idx];
            const textoBranco = corCarta === "bg-black" ? "text-white" : "text-black";

            return (
                <div
                key={idx}
                className={`w-28 h-20 rounded-lg shadow flex items-center justify-center text-center text-sm cursor-pointer p-1 ${corCarta} ${textoBranco}`}
                >
                {palavra}
                </div>
            );
            })
        ) : (
            Array.from({ length: boardSize * boardSize }).map((_, idx) => (
            <div
                key={idx}
                className="w-28 h-20 bg-gray-200 rounded-lg shadow flex items-center justify-center text-center text-sm"
            >
                {/* Placeholder vazio */}
            </div>
            ))
        )}
        </div>

        {/* Time B */}
        <div className="w-1/5 p-4 bg-white rounded-lg shadow">
          <h2 className={`text-xl font-bold mb-2 ${corTimeB}`}>
            Time B
          </h2>
          <p className="text-gray-700 mb-2">Espião Mestre: Jogador 4</p>
          <ul className="space-y-1 text-gray-600">
            <li>Jogador 5</li>
            <li>Jogador 6</li>
          </ul>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white p-4 rounded-lg shadow overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Chat do Jogo</h2>
        <div className="h-40 overflow-y-auto border border-gray-300 p-2 mb-2 rounded">
          <p className="text-gray-500 italic">Mensagens aparecem aqui...</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            className="flex-1 p-2 border border-gray-300 rounded-lg"
          />
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
