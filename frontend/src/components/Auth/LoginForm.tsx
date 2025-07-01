import { type FormEvent, useState } from 'react';
import { useNotification } from '../Modal/useNotification';

interface LoginFormProps {
  onSwitch: () => void;
  onLogin: () => void;
}

const LoginForm = ({ onSwitch, onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { notify } = useNotification();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      notify("Preencha todos os campos!", "error");
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        notify("Credenciais inválidas", "error");
        return;
      }

      const userDataRes = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      });

      if (!userDataRes.ok) {
        notify("Erro ao buscar dados do usuário", "error");
        return;
      }

      const userData = await userDataRes.json();
      localStorage.setItem("userId", userData.id);
      localStorage.setItem("username", userData.username); 
      
      notify("Login realizado com sucesso!", "success");
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className='w-99'>
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo de volta</h2>
      <p className="text-gray-600 mb-8">Faça login para continuar</p>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
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
        
        <div className="mb-6">
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
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 cursor-pointer text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSwitch}
          className="text-primary hover:underline"
        >
          Não tem uma conta? Registre-se
        </button>
      </div>
    </div>
  );
};

export default LoginForm;