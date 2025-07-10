import { type FormEvent, useState } from 'react';
import { useNotification } from '../Modal/useNotification';
interface RegisterFormProps {
  onSwitch: () => void;
}

const RegisterForm = ({ onSwitch }: RegisterFormProps) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      notify("As senhas não coincidem", "error");
      return;
    }

    setIsLoading(true);

    try {
      console.log(username, email, password, confirmPassword)
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        notify("Erro ao criar conta: " + (errorData.message || response.statusText), "error");
        return;
      }

      notify("Conta criada com sucesso!", "success");
      onSwitch();
    } catch (err) {
      setError((err as Error).message);
      notify(`${(err as Error).message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Crie sua conta</h2>
      <p className="text-gray-600 mb-8">Junte-se à nossa comunidade</p>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        <div className='flex gap-4'>
            <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 mb-2">
                    Nome completo
                </label>
                <input
                    type="text"
                    id="name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                />
            </div>
            <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                />
            </div>
        </div>
        <div className='flex gap-4'>
            <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 mb-2">
                Senha
            </label>
            <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                minLength={6}
            />
            </div>
            
            <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-gray-700 mb-2">
                Confirmar senha
            </label>
            <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                minLength={6}
            />
            </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="cursor-pointer w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSwitch}
          className="cursor-pointer text-primary hover:underline"
        >
          Já tem uma conta? Faça login
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;