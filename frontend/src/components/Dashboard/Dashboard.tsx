import { useState, useEffect, useCallback } from "react"; // Adicionado useCallback
import CreateLobbyModal from "./CreateLobbyModal";
// O caminho da sua importação. Se o arquivo estiver em src/components/Modal/useNotification.ts, está correto.
import { useNotification } from "../Modal/useNotification"; 

import { LockClosedIcon } from '@heroicons/react/24/solid';

// ===================================================================
// CORREÇÃO 1: Tipos alinhados com o Banco de Dados
// ===================================================================
type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface DashboardProps {
  onLogout: () => void;
  onEnterLobby: (lobbyId: string, difficulty: Difficulty) => void;
}

const API_URL = import.meta.env.VITE_API_URL;

interface Lobby {
  id: number;
  name: string;
  difficulty_name: Difficulty; // Usando o tipo corrigido
  code_lobby: string;
  creator_name: string;
  created_by: number;
  status: 'waiting' | 'in_game' | 'finished';
  is_private: boolean;
}

const Dashboard = ({ onLogout, onEnterLobby }: DashboardProps) => {
  const [searchCode, setSearchCode] = useState("");
  const username = localStorage.getItem("username") || "Usuário";
  const { notify } = useNotification();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [matchHistory] = useState([
    { id: 1, result: "Vitória", date: "25/06/2025" },
    { id: 2, result: "Derrota", date: "24/06/2025" },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  // Estado inicial alinhado com o tipo corrigido
  const [lobbyDifficulty, setLobbyDifficulty] = useState<Difficulty>("Normal"); 
  const [lobbyPassword, setLobbyPassword] = useState("");

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");

  // Usando useCallback para a função ser estável e poder ser usada no useEffect
  const fetchLobbys = useCallback(async () => {
    try {
      const url = searchCode ? `${API_URL}/lobbys?search=${searchCode}` : `${API_URL}/lobbys`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setLobbies(data);
      } else {
        throw new Error(data.message || "Erro ao buscar salas");
      }
    } catch (err) {
      console.error("Erro ao buscar salas:", err);
    }
  }, [searchCode]); // A função agora só é recriada se searchCode mudar

  useEffect(() => {
    fetchLobbys();
    const interval = setInterval(() => {
      if (!searchCode) {
        fetchLobbys();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [searchCode, fetchLobbys]); // Adicionando fetchLobbys à dependência


  const handleCreateLobby = async () => {
    if (!lobbyName.trim()) {
      notify("Por favor, dê um nome ao seu lobby.", "info");
      return;
    }

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        notify("Erro: Usuário não logado. Por favor, faça login novamente.", "error");
        return;
      }

      // ===================================================================
      // CORREÇÃO 2: Mapeamento alinhado com o Banco de Dados
      // ===================================================================
      const payload = {
        name: lobbyName,
        // As chaves do objeto AGORA correspondem exatamente às strings no estado/tipo
        game_mode_id: { "Fácil": 1, "Normal": 2, "Difícil": 3, "HARDCORE": 4 }[lobbyDifficulty],
        created_by: Number(userId),
        password: lobbyPassword || null,
      };

      // Garantir que o game_mode_id foi encontrado
      if (!payload.game_mode_id) {
          throw new Error(`Dificuldade inválida selecionada: ${lobbyDifficulty}`);
      }

      const response = await fetch(`${API_URL}/lobbys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar lobby");
      }

      setIsCreateModalOpen(false);
      notify("Lobby criado com sucesso!", "success");
      onEnterLobby(data.code_lobby, data.difficulty_name);

    } catch (err: unknown) {
      console.error("Erro ao criar lobby:", err);
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };

  const attemptToEnterLobby = (lobby: Lobby) => {
    if (lobby.is_private) {
      setSelectedLobby(lobby);
      setIsPasswordModalOpen(true);
    } else {
      onEnterLobby(lobby.code_lobby, lobby.difficulty_name);
    }
  };

  const handleEnterPrivateLobby = async () => {
    if (!selectedLobby) return;
    try {
      const response = await fetch(`${API_URL}/lobbys/${selectedLobby.code_lobby}?password=${enteredPassword}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao entrar no lobby");
      }

      setIsPasswordModalOpen(false);
      setEnteredPassword("");
      onEnterLobby(data.code_lobby, data.difficulty_name);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };


  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
    onLogout();
  };

  const handleDeleteLobby = async (lobbyId: number) => {
    if (!window.confirm("Tem certeza que deseja deletar este lobby?")) return;
    try {
      const response = await fetch(`${API_URL}/lobbys/${lobbyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: localStorage.getItem("userId") })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      notify("Lobby deletado com sucesso.", "success");
      fetchLobbys();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };

  // ===================================================================
  // CORREÇÃO 3: Passando as opções corretas para o Modal
  // ===================================================================
  const difficultyOptions: Difficulty[] = ["Fácil", "Normal", "Difícil", "HARDCORE"];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-100 flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-3xl font-bold">Bem-vindo, {username}!</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Sair
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Lobbys</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
            >
              Criar Lobby
            </button>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Buscar por código ou nome"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg min-w-[150px]"
            />
            <button
              onClick={() => setSearchCode('')}
              className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
            >
              Limpar
            </button>
          </div>

          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {lobbies.length > 0 ? lobbies.map((lobby) => (
              <li key={lobby.id} className="flex justify-between items-center bg-gray-50 shadow p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  {lobby.is_private && <LockClosedIcon className="h-5 w-5 text-gray-500" />}
                  <div>
                    <p className="font-semibold">{lobby.name} <span className="text-gray-500 font-normal">({lobby.code_lobby})</span></p>
                    <p className="text-sm text-gray-600">
                      Criador: {lobby.creator_name} | Status:
                      <span className={lobby.status === 'in_game' ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                        {lobby.status === 'in_game' ? ' Em Jogo' : ' Aguardando'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => attemptToEnterLobby(lobby)}
                    disabled={lobby.status === 'in_game'}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Entrar
                  </button>

                  {lobby.created_by === Number(localStorage.getItem("userId")) && (
                    <button
                      onClick={() => handleDeleteLobby(lobby.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Deletar
                    </button>
                  )}
                </div>
              </li>
            )) : <p className="text-center text-gray-500">Nenhum lobby encontrado.</p>}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Histórico de Partidas</h2>
          <ul className="space-y-2">
            {matchHistory.length > 0 ? matchHistory.map((match) => (
              <li key={match.id} className="p-4 bg-gray-50 border rounded-lg flex justify-between">
                <span>Partida {match.id} - {match.result}</span>
                <span className="text-gray-500">{match.date}</span>
              </li>
            )) : <p className="text-gray-500">Nenhuma partida registrada ainda.</p>}
          </ul>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateLobbyModal
          lobbyName={lobbyName}
          setLobbyName={setLobbyName}
          lobbyDifficulty={lobbyDifficulty}
          setLobbyDifficulty={setLobbyDifficulty}
          difficultyOptions={difficultyOptions}
          lobbyPassword={lobbyPassword}
          setLobbyPassword={setLobbyPassword}
          onClose={() => setIsCreateModalOpen(false)}
          onConfirm={handleCreateLobby}
        />
      )}

      {isPasswordModalOpen && selectedLobby && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-black">
            <h3 className="text-xl font-bold mb-4">Entrar em Sala Privada</h3>
            <p className="mb-4">O lobby "{selectedLobby.name}" é protegido por senha.</p>
            <input
              type="password"
              placeholder="Digite a senha"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancelar</button>
              <button onClick={handleEnterPrivateLobby} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;