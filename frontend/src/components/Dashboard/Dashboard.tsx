import { useState, useEffect, useCallback } from "react";
import CreateLobbyModal from "./CreateLobbyModal";
import { useNotification } from "../Modal/useNotification"; 
import { LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface Lobby {
  id: number;
  name: string;
  difficulty_name: Difficulty;
  code_lobby: string;
  creator_name: string;
  created_by: number;
  status: 'waiting' | 'in_game' | 'finished';
  is_private: boolean;
  playerIds?: string[];
}

interface MatchHistoryItem {
  lobbyId: number;
  lobbyName: string;
  difficulty: string;
  userWon: boolean;
  finishedAt: string;
}

interface DashboardProps {
  onLogout: () => void;
  onEnterLobby: (lobbyId: string, difficulty: Difficulty) => void;
}

const Dashboard = ({ onLogout, onEnterLobby}: DashboardProps) => {
  const [searchCode, setSearchCode] = useState("");
  const username = localStorage.getItem("username") || "Usuário";
  const userId = localStorage.getItem("userId");
  const { notify } = useNotification();

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  const [lobbyDifficulty, setLobbyDifficulty] = useState<Difficulty>("Normal"); 
  const [lobbyPassword, setLobbyPassword] = useState("");

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [enteredPassword, setEnteredPassword] = useState("");
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [lobbyToDelete, setLobbyToDelete] = useState<Lobby | null>(null);

  const fetchLobbys = useCallback(async () => {
    try {
      const url = searchCode ? `/api/lobbys?search=${searchCode}` : `/api/lobbys`;
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
  }, [searchCode]);

  const fetchMatchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/history?userId=${userId}`, { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setMatchHistory(data);
      } else {
        throw new Error(data.message || "Erro ao buscar histórico");
      }
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchLobbys();
    fetchMatchHistory();
    const interval = setInterval(() => {
      if (!searchCode) {
        fetchLobbys();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [searchCode, fetchLobbys, fetchMatchHistory]);

  const handleCreateLobby = async () => {
    if (!lobbyName.trim()) {
      notify("Por favor, dê um nome ao seu lobby.", "info");
      return;
    }
    try {
      if (!userId) {
        notify("Erro: Usuário não logado.", "error");
        return;
      }
      const payload = {
        name: lobbyName,
        game_mode_id: { "Fácil": 1, "Normal": 2, "Difícil": 3, "HARDCORE": 4 }[lobbyDifficulty],
        created_by: Number(userId),
        password: lobbyPassword || null,
      };
      if (!payload.game_mode_id) {
          throw new Error(`Dificuldade inválida selecionada: ${lobbyDifficulty}`);
      }
      const response = await fetch(`/api/lobbys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar lobby");
      }
      setIsCreateModalOpen(false);
      setLobbyName("");
      setLobbyPassword("");
      notify("Lobby criado com sucesso!", "success");
      
      onEnterLobby(data.code_lobby, data.difficulty_name);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };

  const attemptToEnterLobby = (lobby: Lobby) => {
    const isUserInThisLobby = lobby.playerIds?.includes(userId || '-1');
    if (lobby.is_private && !isUserInThisLobby) {
      setSelectedLobby(lobby);
      setIsPasswordModalOpen(true);
    } else {
      onEnterLobby(lobby.code_lobby, lobby.difficulty_name);
    }
  };

  const handleEnterPrivateLobby = async () => {
    if (!selectedLobby) return;
    try {
      const response = await fetch(`/api/lobbys/${selectedLobby.code_lobby}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPassword })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Senha incorreta ou erro ao verificar lobby.");
      }
      
      setIsPasswordModalOpen(false);
      setEnteredPassword("");
      onEnterLobby(selectedLobby.code_lobby, selectedLobby.difficulty_name);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };

  const handleLogout = () => {
    fetch(`/api/auth/logout`, { method: 'POST', credentials: 'include' })
      .catch(error => console.error("Erro no fetch de logout:", error))
      .finally(() => {
        onLogout();
      });
  };

  const openDeleteConfirmation = (lobby: Lobby) => {
    setLobbyToDelete(lobby);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteLobby = async () => {
    if (!lobbyToDelete) return;
    try {
      const response = await fetch(`/api/lobbys/${lobbyToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: localStorage.getItem("userId") })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      notify("Lobby deletado com sucesso.", "success");
      fetchLobbys();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    } finally {
      setIsDeleteModalOpen(false);
      setLobbyToDelete(null);
    }
  };

  const difficultyOptions: Difficulty[] = ["Fácil", "Normal", "Difícil", "HARDCORE"];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-[url('/Codenames BG.png')] bg-cover bg-center opacity-20" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Bem-vindo, {username}!</h1>
          <div className="flex gap-2">
           <button onClick={handleLogout} className="cursor-pointer px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
             Sair
           </button>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[70vh]">
        {/* Coluna da esquerda: Lobbys + Histórico */}
        <div className="flex flex-col gap-6 w-full lg:w-1/2">
          {/* Lobbys */}
          <div className="bg-gray-800 bg-opacity-70 border border-gray-700 p-6 rounded-lg shadow flex flex-col h-[60%] min-h-[380px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Lobbys</h2>
              <button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition">Criar Lobby</button>
            </div>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Buscar por código ou nome"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 placeholder-gray-400"
              />
              <button onClick={() => setSearchCode('')} className="cursor-pointer px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Limpar</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {lobbies.length > 0 ? lobbies.map((lobby) => {
                const isLobbyInGameOrWaitingWithPlayers = lobby.status === 'in_game' || (lobby.playerIds && lobby.playerIds.length > 0);
                const isUserInThisLobby = lobby.playerIds?.includes(userId || '-1');
                let buttonText = 'Entrar';
                let buttonEnabled = lobby.status !== 'in_game';
                let buttonClass = 'bg-green-500 hover:bg-green-600';

                if (isLobbyInGameOrWaitingWithPlayers) {
                  if (isUserInThisLobby) {
                    buttonText = 'Voltar';
                    buttonEnabled = true;
                    buttonClass = 'bg-orange-500 hover:bg-orange-600';
                  } else if (lobby.status === 'in_game') {
                    buttonText = 'Em Jogo';
                    buttonEnabled = false;
                    buttonClass = 'bg-gray-500';
                  }
                }

                return (
                  <div key={lobby.id} className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div className="flex items-center gap-2">
                      {lobby.is_private && <LockClosedIcon className="h-5 w-5 text-gray-400" />}
                      <div>
                        <div className="font-semibold">{lobby.name} <span className="text-gray-400">({lobby.code_lobby})</span></div>
                        <div className="text-sm text-gray-400">Criador: {lobby.creator_name} | Status: <span className={lobby.status === 'in_game' ? 'text-red-400' : 'text-green-400'}>{lobby.status === 'in_game' ? 'Em Jogo' : 'Aguardando'}</span></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => attemptToEnterLobby(lobby)}
                        disabled={!buttonEnabled}
                        className={`cursor-pointer px-3 py-1 text-sm text-white rounded ${buttonClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {buttonText}
                      </button>
                      {lobby.creator_name === username && lobby.status === 'waiting' && (
                        <button
                          onClick={() => openDeleteConfirmation(lobby)}
                          className="cursor-pointer px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Deletar
                        </button>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <p className="text-center text-gray-400">Nenhum lobby encontrado.</p>
              )}
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-gray-800 bg-opacity-70 border border-gray-700 p-6 rounded-lg shadow flex-1 flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex-shrink-0">Histórico de Partidas</h2>
            
            {matchHistory.length > 0 ? (
              <div className="overflow-y-auto flex-1 max-h-[150px] pr-1">
                <ul className="space-y-3">
                  {matchHistory.map((match) => (
                    <li
                      key={match.lobbyId}
                      className={`p-3 rounded border-l-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                        match.userWon
                          ? 'bg-green-900 border-green-500 hover:bg-green-800'
                          : 'bg-red-900 border-red-500 hover:bg-red-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{match.lobbyName}</p>
                          <p className="text-sm text-gray-300">
                            <span className="font-medium">
                              {match.userWon ? 'Vitória' : 'Derrota'}
                            </span>{' '}
                            • Modo: {match.difficulty}
                          </p>
                        </div>
                        <span className="text-sm text-gray-400">
                          {new Date(match.finishedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-center text-gray-400 flex-1">Nenhuma partida registrada ainda.</p>
            )}
          </div>

        </div>

        {/* Coluna da direita: Regras */}
        <div className="w-full lg:w-1/2 bg-gray-800 bg-opacity-80 text-white p-6 rounded-lg shadow border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-center">Como funciona o jogo?</h2>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            O jogo é dividido entre dois times: Azul e Vermelho. Um jogador de cada time assume o papel de <strong>Espião Mestre</strong> e os demais são <strong>Agentes</strong>.
            O objetivo é encontrar todas as palavras do seu time antes do adversário, evitando a carta do <strong>assassino</strong>, que elimina o time instantaneamente.
            A cada rodada, o espião dá uma dica e um número, e os agentes devem tentar adivinhar quais palavras se encaixam.
          </p>

          <h2 className="text-xl font-bold mb-4 text-center">Modos de Jogo</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm leading-relaxed">
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="font-bold text-blue-400 mb-2">Modo Fácil</h3>
              <ul className="list-disc list-inside text-gray-300">
                <li>Espião: 5 minutos</li>
                <li>Agentes: 5 minutos</li>
                <li>Cartas: 9 Azuis, 8 Vermelhas, 1 Preta, 7 Neutras</li>
              </ul>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="font-bold text-yellow-400 mb-2">Modo Normal</h3>
              <ul className="list-disc list-inside text-gray-300">
                <li>Espião: 3 minutos</li>
                <li>Agentes: 3 minutos</li>
                <li>Cartas: 9 Azuis, 8 Vermelhas, 1 Preta, 7 Neutras</li>
              </ul>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="font-bold text-red-400 mb-2">Modo Difícil</h3>
              <ul className="list-disc list-inside text-gray-300">
                <li>Espião: 1 minuto</li>
                <li>Agentes: 1 minuto</li>
                <li>Cartas: 9 Azuis, 8 Vermelhas, 4 Pretas, 4 Neutras</li>
              </ul>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="font-bold text-pink-400 mb-2">Modo HARDCORE</h3>
              <ul className="list-disc list-inside text-gray-300">
                <li>Espião: 30 segundos</li>
                <li>Agentes: 30 segundos</li>
                <li>Cartas: 9 Azuis, 8 Vermelhas, todas as demais são Pretas</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Modais (inalterados) */}
      {isCreateModalOpen && (<CreateLobbyModal {...{ lobbyName, setLobbyName, lobbyDifficulty, setLobbyDifficulty, difficultyOptions, lobbyPassword, setLobbyPassword, onClose: () => setIsCreateModalOpen(false), onConfirm: handleCreateLobby }} />)}

      {isPasswordModalOpen && selectedLobby && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Entrar em Sala Privada</h3>
            <p className="mb-4">O lobby <strong>{selectedLobby.name}</strong> é protegido por senha.</p>
            <input type="password" placeholder="Digite a senha" value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white mb-4" autoFocus />
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsPasswordModalOpen(false)} className="cursor-pointer px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Cancelar</button>
              <button onClick={handleEnterPrivateLobby} className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Entrar</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && lobbyToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-600 p-2 rounded-full"><ExclamationTriangleIcon className="h-6 w-6 text-white" /></div>
              <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="mb-6">Deseja deletar o lobby <strong>{lobbyToDelete.name}</strong>? Esta ação é irreversível.</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="cursor-pointer px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Cancelar</button>
              <button onClick={handleDeleteLobby} className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Deletar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
