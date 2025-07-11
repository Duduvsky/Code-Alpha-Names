import { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

import authImg01 from '../../assets/Img01.jpeg';
import authImg02 from '../../assets/Img02.jpg';

interface AuthFormProps {
  onLogin: () => void;
  goBack?: () => void;
}

const AuthForm = ({ onLogin, goBack }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);

  const toggleForm = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setShowContent(false);
    setTimeout(() => setIsLogin((prev) => !prev), 100);
    setTimeout(() => {
      setShowContent(true);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-6xl bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
        <div className="flex flex-col md:flex-row p-4 gap-4">

          {/* Imagem */}
          <div className={`hidden md:flex w-1/2 bg-gray-900 flex-col items-center justify-center px-6 py-8 transition-all duration-300 transform ${
            !isLogin ? 'md:order-last animate-slide-in-left' : 'animate-slide-in-right'
          }`}>
            <h1 className="text-4xl font-bold mb-6 text-center">Code Alpha Names</h1>
            <img
              src={isLogin ? authImg02 : authImg01}
              alt={isLogin ? 'Login' : 'Register'}
              className="w-80 h-60 object-cover rounded-lg shadow mb-4"
            />
            {goBack && (
              <button
                onClick={goBack}
                className="cursor-pointer text-sm text-blue-400 border border-blue-500 px-3 py-1 rounded hover:bg-blue-900 transition"
              >
                ← Voltar para o início
              </button>
            )}
          </div>

          {/* Formulário */}
          <div className="md:w-1/2 px-8 py-6 flex items-center justify-center relative overflow-hidden min-h-[450px]">
            <div
              className={`w-full transition-all duration-300 transform ${
                showContent
                  ? 'opacity-100 translate-x-0 scale-100'
                  : 'opacity-0 translate-x-4 scale-95'
              }`}
            >
              {isLogin ? (
                <LoginForm onSwitch={toggleForm} onLogin={onLogin} />
              ) : (
                <RegisterForm onSwitch={toggleForm} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
