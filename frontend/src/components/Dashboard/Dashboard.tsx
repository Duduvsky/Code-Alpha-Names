import { useState, useEffect } from "react";
import CreateLobbyModal from "./CreateLobbyModal";
interface DashboardProps {
  onLogout: () => void;
  onEnterLobby: () => void;
}

const API_URL = import.meta.env.VITE_API_URL;

const Dashboard = ({ onLogout, onEnterLobby }: DashboardProps) => {
  const [searchCode, setSearchCode] = useState("");
    const username = localStorage.getItem("username") || "Usuário";
  interface Lobby {
    id: number;
    name: string;
    difficulty_name: string;
    code_lobby: string;
    creator_name: string;
  }
  
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [matchHistory] = useState([
    { id: 1, result: "Vitória", date: "25/06/2025" },
    { id: 2, result: "Derrota", date: "24/06/2025" },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  const [lobbyDifficulty, setLobbyDifficulty] = useState("Normal");

  useEffect(() => {
    const fetchLobbys = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const url = searchCode ? `${API_URL}/lobbys?search=${searchCode}` : `${API_URL}/lobbys`;
        const response = await fetch(url);
        const data = await response.json();
        setLobbies(data);
      } catch (err) {
        console.error("Erro ao buscar salas:", err);
      }
    };

    fetchLobbys();

    if (!searchCode) {
      const interval = setInterval(fetchLobbys, 5000);
      return () => clearInterval(interval);
    }
  }, [searchCode]);

  const closeModal = () => {
    setShowModal(false);
    setLobbyName("");
    setLobbyDifficulty("Normal");
  };

  const handleCreateLobby = async () => {
    try {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        console.error("Usuário não encontrado, faça login novamente.");
        return;
      }

      const response = await fetch(`${API_URL}/lobbys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lobbyName,
          game_mode_id: lobbyDifficulty,
          created_by: userId,
        }),
      });
      if (!response.ok) {
        console.error("Erro ao criar lobby");
        return;
      }
      const data = await response.json();
      setLobbies((prev) => [data, ...prev]);
      closeModal();
    } catch (err) {
      console.error("Erro ao criar lobby:", err);
    }
  };

  const handleSearchLobby = async () => {
    try {
      const response = await fetch(`${API_URL}/lobbys?search=${searchCode}`);
      const data = await response.json();
      setLobbies(data);
    } catch (err) {
      console.error("Erro ao buscar salas:", err);
    }
  };

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    onLogout();
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100 flex flex-col gap-8">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bem-vindo, {username}!</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:cursor-pointer hover:bg-red-600 transition"
        >
          Sair
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Área de Lobbys */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Lobbys</h2>
          
          <button
            onClick={() => setShowModal(true)}
            className="mb-6 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:cursor-pointer hover:bg-yellow-600 transition"
          >
            Criar Lobby
          </button>

          <div className="mb-6 flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Código do Lobby"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleSearchLobby}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:cursor-pointer hover:bg-blue-600 transition"
            >
              Buscar
            </button>
            <button
              onClick={() => setSearchCode('')}
              className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
            >
              Limpar busca
            </button>
          </div>

          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 sm:max-h-100">
            {lobbies.map((lobby) => (
              <li key={lobby.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center">
                <span>
                  <strong>{lobby.name}</strong> ({lobby.code_lobby}) - {lobby.creator_name} - {lobby.difficulty_name}
                </span>
                <button onClick={onEnterLobby} 
                className="px-4 py-2 text-primary rounded-lg bg-green-500 hover:cursor-pointer hover:bg-green-600 transition">Entrar</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Histórico de Partidas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Histórico de Partidas</h2>
          {matchHistory.length === 0 ? (
            <p className="text-gray-500">Nenhuma partida registrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {matchHistory.map((match) => (
                <li key={match.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex justify-between">
                  <span>Partida {match.id} - {match.result}</span>
                  <span className="text-gray-500">{match.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CreateLobbyModal
          lobbyName={lobbyName}
          setLobbyName={setLobbyName}
          lobbyDifficulty={lobbyDifficulty}
          setLobbyDifficulty={setLobbyDifficulty}
          onClose={closeModal}
          onConfirm={handleCreateLobby}
        />
      )}
    </div>
  );
};

export default Dashboard;
