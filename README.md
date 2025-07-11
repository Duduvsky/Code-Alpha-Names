# 🕵️ Code Alpha Names

**Code Alpha Names** é uma versão online multiplayer inspirada no clássico jogo de tabuleiro *Codenames*, com visual temático estilo espionagem e interface moderna. Os jogadores podem se juntar a lobbies, formar times, dar dicas e tentar decifrar as palavras certas antes do time adversário!

> 🎮 Jogue como agente ou espião mestre. Dê dicas, adivinhe palavras e evite a temida carta preta!

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** React + TypeScript + TailwindCSS
- **Backend:** Express + WebSocket + PostgreSQL
- **Banco de Dados:** PostgreSQL
- **Comunicação em Tempo Real:** WebSocket custom
- **Gerenciamento de Estado:** React `useState`, `useEffect`, custom hooks
- **Autenticação:** Sessão com cookie + JWT
- **Deploy:** AWS EC2, S3, RDS

---

## 📦 Funcionalidades

- ✅ Login e cadastro com validação e feedback visual
- ✅ Troca dinâmica entre formulários com animação
- ✅ Criação de lobbies públicos ou privados
- ✅ Entrada via código ou busca
- ✅ Partidas multiplayer em tempo real
- ✅ Times Azul e Vermelho com papéis distintos
- ✅ Quatro modos de jogo: Fácil, Normal, Difícil e HARDCORE
- ✅ Dicas e adivinhações com sistema de pontuação
- ✅ Cartas reveladas com estilos visuais únicos
- ✅ Chat interno no lobby e durante o jogo
- ✅ Histórico de partidas por jogador

---

## 🧠 Modos de Jogo

| Modo       | Duração por turno | Carta Preta | Cartas Neutras | Dificuldade |
|------------|-------------------|-------------|----------------|-------------|
| Fácil      | 5 min (dica) / 3 min (jogada) | 1           | várias        | 🟢 Baixa     |
| Normal     | 3 min por turno   | 1           | várias        | 🟡 Média     |
| Difícil    | 1 min por turno   | 4           | algumas       | 🔴 Alta      |
| HARDCORE   | 30 segundos       | todas       | nenhuma       | ⚫ Extrema   |

---

## 🖼️ Layout

- Interface moderna e responsiva
- Dashboard com histórico, lobbies e modos de jogo
- Estilo dark elegante na tela de jogo
- Efeitos visuais para cartas reveladas
- Imagens temáticas no estilo *Spy x Family*

---

## ⚙️ Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/code-alpha-names.git
cd code-alpha-names

# 2. Instale as dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves (API, DB, etc)

# 4. Rode o frontend
npm run dev

# (Opcional) Rode o backend em outra aba
cd backend
npm install
npm run dev
