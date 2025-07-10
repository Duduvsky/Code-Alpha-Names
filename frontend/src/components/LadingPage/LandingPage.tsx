import { useState, useEffect } from "react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? false : true;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const carouselImages = [
    "/Component 1.png",
    "/Component 2.png",
    "/Component 3.png",
    "/Component 4.png",
  ];

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % carouselImages.length
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  const bgMain = darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900";
  const bgSection = darkMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-600";

  return (
    <div className={bgMain}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur bg-opacity-90 ${bgSection} border-b flex justify-between items-center px-6 py-4`}>
        <h1 className="text-2xl font-bold uppercase">Code Alpha</h1>

        <nav className="hidden md:flex gap-6 items-center">
          <a href="#carousel" className="hover:underline">Início</a>
          <a href="#about" className="hover:underline">Como Jogar</a>
          <a href="#team" className="hover:underline">Equipe</a>
          <button onClick={onStart} className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500">Jogar Agora</button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="cursor-pointer ml-2 p-2 rounded-full hover:scale-110 transition-all"
            title={darkMode ? "Tema Claro" : "Tema Escuro"}
          >
            <span className="text-2xl">{darkMode ? "🌞" : "💡"}</span>
          </button>
        </nav>

        <button className="cursor-pointer md:hidden" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={`sticky top-[65px] left-0 w-full px-6 pb-4 z-40 ${bgSection}`}>
          <a href="#carousel" onClick={() => setMenuOpen(false)} className="block pt-4 pb-2">Início</a>
          <a href="#about" onClick={() => setMenuOpen(false)} className="block py-2">Como Jogar</a>
          <a href="#team" onClick={() => setMenuOpen(false)} className="block py-2">Equipe</a>
          <div className="flex gap-2">
            <button onClick={() => { setMenuOpen(false); onStart(); }} className="cursor-pointer block w-full mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500">
              Jogar Agora
            </button>
            <button
                onClick={() => setDarkMode(!darkMode)}
                className="cursor-pointer mt-4 p-2 rounded-full hover:scale-110 transition-all"
            >
                <span className="text-2xl">{darkMode ? "🌞" : "💡"}</span>
            </button>
          </div>

        </div>
      )}

      {/* Carousel */}
      <section id="carousel" className="relative h-[80vh] mb-10 overflow-hidden">
        {carouselImages.map((src, index) => (
        <img
          key={index}
          src={src}
          alt={`Slide ${index}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        />
        ))}
      </section>

      {/* COMO JOGAR */}
      <section id="about" className={`py-20 px-6 max-w-4xl mx-auto rounded-lg shadow-lg ${bgSection}`}>
        <h3 className="text-4xl font-extrabold mb-8 text-center">Como Jogar – Missão Codenames</h3>

        <div className="space-y-8">
          {/* Setup */}
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎯</div>
            <div>
              <h4 className="text-2xl font-bold">🔎 Preparação</h4>
              <p>
                Dividam-se em duas equipes (vermelha e azul). Cada uma elege um mestre-espião (spymaster) e os demais são agentes de campo.
                Formem uma grade 5×5 com 25 cartas-código e coloquem um “mapa secreto” em um suporte visível apenas aos espiões. Ele indica:
              </p>
              <ul className="list-disc ml-6 mt-2">
                <li>Quais palavras são dos seus agentes;</li>
                <li>Quais são inocentes (bystanders);</li>
                <li>Qual é o perigoso “assassino”.</li>
              </ul>
              <p className={`mt-2 italic text-sm ${textMuted}`}>
                A equipe que começar tem um agente a mais para descobrir.
              </p>
            </div>
          </div>

          {/* Dando dicas */}
          <div className="flex items-start gap-4">
            <div className="text-3xl">🧠</div>
            <div>
              <h4 className="text-2xl font-bold">💡 Dando Dicas</h4>
              <p>
                Cada spymaster fornece apenas <strong>uma palavra + um número</strong>. Ex: “Oceano 3”.
              </p>
              <p className={`mt-2 italic text-sm ${textMuted}`}>
                Não pode usar parte das palavras visíveis nem fazer gestos. Silêncio é essencial.
              </p>
            </div>
          </div>

          {/* Adivinhando */}
          <div className="flex items-start gap-4">
            <div className="text-3xl">👥</div>
            <div>
              <h4 className="text-2xl font-bold">👥 Adivinhando</h4>
              <p>Os agentes tocam nas palavras:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Se for do time → pode continuar.</li>
                <li>Se for inocente ou do adversário → turno acaba.</li>
                <li>Se for o assassino → derrota imediata.</li>
              </ul>
              <p className={`mt-2 italic text-sm ${textMuted}`}>
                É permitido adivinhar até o número da dica + 1.
              </p>
            </div>
          </div>

          {/* Vitória */}
          <div className="flex items-start gap-4">
            <div className="text-3xl">🏅</div>
            <div>
              <h4 className="text-2xl font-bold">🎉 Vitória ou Perda</h4>
              <p>O jogo termina quando:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Todos os agentes forem encontrados → vitória;</li>
                <li>O assassino for revelado → derrota.</li>
              </ul>
            </div>
          </div>

          {/* Botão */}
          <div className="text-center mt-8">
            <button onClick={onStart} className="cursor-pointer bg-yellow-600 text-gray-900 font-bold px-8 py-3 rounded-full hover:bg-yellow-500 transition">
              → Jogar Agora!
            </button>
          </div>
        </div>
      </section>

      {/* EQUIPE */}
      <section id="team" className={`py-16 px-6 mt-10 ${bgSection}`}>
        <h3 className="text-3xl font-bold mb-10 text-center">Equipe de Desenvolvimento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <img src="/dev01.jpg" alt="Dev 1" className="w-32 h-32 rounded-full mb-4 object-cover" />
            <h4 className="text-xl font-semibold">Agente 01 - Samuel Mori</h4>
            <p className={`text-sm mt-2 ${textMuted}`}>Backend e Websocket + lógica em tempo real do jogo. </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img src="/dev02.jpg" alt="Dev 2" className="w-32 h-32 rounded-full mb-4 object-cover" />
            <h4 className="text-xl font-semibold">Agente 02 - Matheus de Azevedo</h4>
            <p className={`text-sm mt-2 ${textMuted}`}>Frontend e integração com Backend + Gerência de Projeto</p>
          </div>
        </div>
        <p className={`text-center mt-12 italic text-sm ${textMuted}`}>
          Agradecimento especial ao Professor Vitor pelo apoio e mentoria.
        </p>
      </section>

      {/* Footer */}
      <footer className={`text-center py-6 text-sm ${textMuted}`}>
        &copy; {new Date().getFullYear()} Code Alpha. Todos os direitos reservados.
      </footer>
    </div>
  );
}
