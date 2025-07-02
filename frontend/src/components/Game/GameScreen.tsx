import { useState, useRef, useEffect } from "react";
import palavrasData from "../../assets/palavras_jogo.json";

interface GameScreenProps {
  difficulty: "fácil" | "normal" | "difícil" | "HARDCORE";
  onExit: () => void;
  lobbyId: string;
  userId: string;
  username: string;
}

interface ChatMessage {
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}

const GameScreen = ({ difficulty, onExit, lobbyId, userId, username }: GameScreenProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [palavrasTabuleiro, setPalavrasTabuleiro] = useState<string[]>([]);
  const [coresCartas, setCoresCartas] = useState<string[]>([]);
  const [corTimeA, setCorTimeA] = useState<string>("bg-blue-500");
  const [corTimeB, setCorTimeB] = useState<string>("bg-red-500");
  const [showTeamA, setShowTeamA] = useState(false);
  const [showTeamB, setShowTeamB] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getBoardSize = () => (difficulty === "fácil" ? 4 : 5);
  const boardSize = getBoardSize();

  // Configuração do WebSocket
  useEffect(() => {
    const socket = new WebSocket(
      `ws://localhost:3000/chat?lobbyId=${lobbyId}&userId=${userId}&username=${username}`
    );

    socket.onopen = () => console.log("Conexão WebSocket estabelecida");
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message_history') {
        setMessages(data.messages);
      } else if (data.type === 'chat_message') {
        setMessages(prev => [...prev, {
          userId: data.userId,
          username: data.username,
          text: data.text,
          timestamp: new Date(data.timestamp)
        }]);
      }
    };

    socket.onclose = () => console.log("Conexão WebSocket fechada");

    ws.current = socket;

    return () => {
      socket.close();
    };
  }, [lobbyId, userId, username]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && ws.current) {
      ws.current.send(JSON.stringify({
        type: 'chat_message',
        text: newMessage
      }));
      setNewMessage("");
    }
  };

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
    <div className="min-h-screen flex flex-col p-4 bg-gray-100 relative">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        {!gameStarted && (
          <div className="flex items-center gap-4 flex-wrap">
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

      <div className="flex flex-col lg:flex-row justify-evenly mb-4 min-h-[360px] relative">
        {/* Time A (mobile) */}
        <div className="flex justify-between mb-4 lg:hidden">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg" 
            onClick={() => setShowTeamA(!showTeamA)}
          >
            Ver Time A
          </button>
          <button 
            className="px-4 py-2 bg-red-500 text-white rounded-lg" 
            onClick={() => setShowTeamB(!showTeamB)}
          >
            Ver Time B
          </button>
        </div>

        {showTeamA && (
          <div className="absolute top-20 left-4 bg-white shadow-lg p-4 rounded-lg z-50 w-48">
            <h2 className={`text-xl font-bold mb-2 ${corTimeA}`}>Time A</h2>
            <p className="text-gray-700 mb-2">Espião Mestre: {username}</p>
            <ul className="space-y-1 text-gray-600">
              <li>Jogador 2</li>
              <li>Jogador 3</li>
            </ul>
          </div>
        )}

        {showTeamB && (
          <div className="absolute top-20 right-4 bg-white shadow-lg p-4 rounded-lg z-50 w-48">
            <h2 className={`text-xl font-bold mb-2 ${corTimeB}`}>Time B</h2>
            <p className="text-gray-700 mb-2">Espião Mestre: Jogador 4</p>
            <ul className="space-y-1 text-gray-600">
              <li>Jogador 5</li>
              <li>Jogador 6</li>
            </ul>
          </div>
        )}

        {/* Time A (desktop) */}
        <div className="hidden lg:block w-1/5 p-4 bg-white rounded-lg shadow">
          <h2 className={`text-xl font-bold mb-2 ${corTimeA}`}>Time A</h2>
          <p className="text-gray-700 mb-2">Espião Mestre: {username}</p>
          <ul className="space-y-1 text-gray-600">
            <li>Jogador 2</li>
            <li>Jogador 3</li>
          </ul>
        </div>

        {/* Tabuleiro do jogo */}
        <div className={`grid gap-2 grid-cols-5 mx-auto`}>
          {gameStarted ? (
            palavrasTabuleiro.map((palavra, idx) => {
              const corCarta = coresCartas[idx];
              const textoBranco = corCarta === "bg-black" ? "text-white" : "text-black";
              return (
                <div
                  key={idx}
                  className={`w-16 h-12 md:w-28 md:h-20 rounded-lg shadow flex items-center justify-center text-center text-xs md:text-sm cursor-pointer p-1 ${corCarta} ${textoBranco}`}
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    hyphens: "manual",
                    textAlign: "center",
                    padding: "4px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textWrap: "balance",
                  }}
                >
                  <span className="break-words leading-tight">{palavra}</span>
                </div>
              );
            })
          ) : (
            Array.from({ length: boardSize * boardSize }).map((_, idx) => (
              <div 
                key={idx} 
                className="w-16 h-12 md:w-28 md:h-20 bg-gray-200 rounded-lg shadow flex items-center justify-center text-center text-xs md:text-sm"
              >
                {/* Placeholder vazio */}
              </div>
            ))
          )}
        </div>

        {/* Time B (desktop) */}
        <div className="hidden lg:block w-1/5 p-4 bg-white rounded-lg shadow">
          <h2 className={`text-xl font-bold mb-2 ${corTimeB}`}>Time B</h2>
          <p className="text-gray-700 mb-2">Espião Mestre: Jogador 4</p>
          <ul className="space-y-1 text-gray-600">
            <li>Jogador 5</li>
            <li>Jogador 6</li>
          </ul>
        </div>
      </div>

      {/* Chat integrado */}
      <div className="flex-1 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-2">Chat do Jogo</h2>
        <div className="h-40 overflow-y-auto border border-gray-300 p-2 mb-2 rounded">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">Nenhuma mensagem ainda...</p>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`mb-2 ${msg.userId === userId ? 'text-right' : 'text-left'}`}
              >
                <div className={`inline-block p-2 rounded-lg max-w-xs ${
                  msg.userId === userId 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  <div className="font-semibold text-xs">
                    {msg.userId === userId ? 'Você' : msg.username}
                  </div>
                  <div>{msg.text}</div>
                  <div className="text-xs opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua mensagem..." 
            className="flex-1 p-2 border border-gray-300 rounded-lg" 
          />
          <button 
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;