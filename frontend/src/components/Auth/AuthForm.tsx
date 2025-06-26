import { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

import authImg01 from '../../assets/Img01.jpeg';
import authImg02 from '../../assets/Img02.jpg';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);

  const toggleForm = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setShowContent(false);

    setTimeout(() => {
      setIsLogin((prev) => !prev);
    }, 300);

    setTimeout(() => {
      setShowContent(true);
      setIsTransitioning(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          
          {/* Imagem com transição de lado */}
          <div className={`md:w-1/2 bg-gradient-to-br from-primary to-secondary p-8 text-white flex flex-col items-center justify-center transition-all duration-300 ${!isLogin ? 'md:order-last' : ''}`}>
            <div className={`w-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <h1 className="text-4xl text-black font-bold mb-6">Code Alpha Names</h1>
              <p className="text-xl text-black mb-8">
                {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
              </p>
              <img 
                src={isLogin ? authImg01 : authImg02}
                alt={isLogin ? "Login" : "Register"} 
                className="w-128 h-64 mx-auto mb-8 object-cover rounded-lg transition-opacity duration-300"
              />
            </div>
          </div>

          {/* Formulário com troca sincronizada */}
          <div className="md:w-1/2 p-8 md:p-12 relative min-h-[400px] flex items-center justify-center">
            <div className={`transition-opacity duration-300 absolute inset-0 flex items-center justify-center ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              {isLogin ? (
                <LoginForm onSwitch={toggleForm} />
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
