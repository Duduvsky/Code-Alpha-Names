import { useEffect, useState } from "react";

type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface CreateLobbyModalProps {
  lobbyName: string;
  setLobbyName: (name: string) => void;
  lobbyDifficulty: Difficulty;
  setLobbyDifficulty: (difficulty: Difficulty) => void;
  difficultyOptions?: Difficulty[];
  lobbyPassword: string;
  setLobbyPassword: (password: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const CreateLobbyModal = ({
  lobbyName,
  setLobbyName,
  lobbyDifficulty,
  setLobbyDifficulty,
  lobbyPassword,      
  setLobbyPassword,   
  onClose,
  onConfirm,
}: CreateLobbyModalProps) => {
  const [gameModes, setGameModes] = useState<{ id: number; mode: Difficulty }[]>([]);

  useEffect(() => {
    const fetchGameModes = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL;
        const response = await fetch(`${API_URL}/lobbys/modes/all`);
        const data = await response.json();
        setGameModes(data);
      } catch (err) {
        console.error("Erro ao buscar modos de jogo:", err);
      }
    };

    fetchGameModes();
  }, []);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50">
  <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-full max-w-md">
    <h2 className="text-2xl font-bold mb-6">Criar Novo Lobby</h2>

    <div className="space-y-4">
      <div>
        <label className="block mb-2 font-semibold text-gray-300">Nome do Lobby</label>
        <input
          type="text"
          value={lobbyName}
          onChange={(e) => setLobbyName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
          placeholder="Ex: Sala dos Vencedores"
          autoFocus
        />
      </div>

      <div>
        <label className="block mb-2 font-semibold text-gray-300">Dificuldade</label>
        <select
          value={lobbyDifficulty}
          onChange={(e) => setLobbyDifficulty(e.target.value as Difficulty)}
          className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
        >
          {gameModes.map((mode) => (
            <option
              key={mode.id}
              value={mode.mode}
              className="bg-gray-900 text-white"
            >
              {mode.mode}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 font-semibold text-gray-300">Senha (Opcional)</label>
        <input
          type="password"
          value={lobbyPassword}
          onChange={(e) => setLobbyPassword(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
          placeholder="Deixe em branco para uma sala pública"
        />
      </div>
    </div>

    <div className="flex justify-end gap-4 mt-8">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Criar Lobby
      </button>
    </div>
  </div>
</div>

  );
};

export default CreateLobbyModal;