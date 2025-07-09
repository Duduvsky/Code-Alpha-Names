import { useEffect, useState } from "react";

// ===================================================================
// CORREÇÃO 1: Alinhar o tipo com o que o Dashboard e o BD esperam.
// ===================================================================
type Difficulty = "Fácil" | "Normal" | "Difícil" | "HARDCORE";

interface CreateLobbyModalProps {
  lobbyName: string;
  setLobbyName: (name: string) => void;
  lobbyDifficulty: Difficulty;
  setLobbyDifficulty: (difficulty: Difficulty) => void;
  difficultyOptions?: Difficulty[];
  // CORREÇÃO 2: Adicionar as props de senha que estavam faltando.
  lobbyPassword: string;
  setLobbyPassword: (password: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  // Prop opcional para passar as opções, mas vamos focar em buscar da API.
}

const CreateLobbyModal = ({
  lobbyName,
  setLobbyName,
  lobbyDifficulty,
  setLobbyDifficulty,
  lobbyPassword,      // Recebendo a prop
  setLobbyPassword,   // Recebendo a prop
  onClose,
  onConfirm,
}: CreateLobbyModalProps) => {
  // O tipo do estado interno agora usa o tipo Difficulty corrigido.
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
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-black">
        <h2 className="text-2xl font-bold mb-6">Criar Novo Lobby</h2>

        <div className="space-y-4">
          <div className="mb-4">
            <label className="block mb-2 font-medium text-gray-700">Nome do Lobby</label>
            <input
              type="text"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="Ex: Sala dos Vencedores"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium text-gray-700">Dificuldade</label>
            <select
              value={lobbyDifficulty}
              // ===================================================================
              // CORREÇÃO 3: O onChange agora atualiza o estado com o NOME da dificuldade,
              // que é o que o Dashboard espera.
              // ===================================================================
              onChange={(e) => setLobbyDifficulty(e.target.value as Difficulty)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white"
            >
              {/* Removida a opção "Selecione" para garantir que um valor válido esteja sempre selecionado */}
              {gameModes.map((mode) => (
                // O `value` do option DEVE ser o nome do modo, não o ID.
                <option key={mode.id} value={mode.mode}>
                  {mode.mode}
                </option>
              ))}
            </select>
          </div>
          
          {/* =================================================================== */}
          {/* CORREÇÃO 4: Adicionado o campo de senha que estava faltando. */}
          {/* =================================================================== */}
          <div className="mb-4">
            <label className="block mb-2 font-medium text-gray-700">Senha (Opcional)</label>
            <input
              type="password"
              value={lobbyPassword}
              onChange={(e) => setLobbyPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="Deixe em branco para uma sala pública"
            />
          </div>
        </div>


        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Criar Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLobbyModal;