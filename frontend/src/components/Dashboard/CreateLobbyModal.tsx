interface CreateLobbyModalProps {
  lobbyName: string;
  setLobbyName: (value: string) => void;
  lobbyDifficulty: string;
  setLobbyDifficulty: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const CreateLobbyModal = ({
  lobbyName,
  setLobbyName,
  lobbyDifficulty,
  setLobbyDifficulty,
  onClose,
  onConfirm,
}: CreateLobbyModalProps) => {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Criar Novo Lobby</h2>

        <div className="mb-4">
          <label className="block mb-2 text-gray-700">Nome do Lobby</label>
          <input
            type="text"
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Digite o nome do Lobby"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-gray-700">Dificuldade</label>
          <select
            value={lobbyDifficulty}
            onChange={(e) => setLobbyDifficulty(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="Fácil">Fácil</option>
            <option value="Normal">Normal</option>
            <option value="Difícil">Difícil</option>
            <option value="HARDCORE">HARDCORE</option>
          </select>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLobbyModal;
