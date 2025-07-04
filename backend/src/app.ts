// src/app.ts

import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // Importando WebSocket também para tipagem
import cors from 'cors';
import { URL } from 'url'; // Importando o construtor de URL

// Importe suas rotas e os gerenciadores de WebSocket
import authRoutes from './routes/auth.routes';
import lobbyRoutes from './routes/lobby.routes';
import { GameManager } from './game/GameManager';
import { chatManager } from './chat';

dotenv.config();

const app = express();

// Configuração CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rotas REST
app.use('/api/auth', authRoutes);
app.use('/api/lobbys', lobbyRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Criar servidor HTTP a partir do Express
const server = http.createServer(app);

// ===================================================================
// ==           INÍCIO DA LÓGICA DE WEBSOCKET CENTRALIZADA          ==
// ===================================================================

const wss = new WebSocketServer({ server });
const gameManager = new GameManager();
// O chatManager já é um singleton importado, não precisa ser instanciado aqui.

wss.on('connection', (ws: WebSocket, req) => {
  // Usar o objeto URL para parsear o request de forma segura
  // O segundo argumento é uma base para resolver URLs relativas, essencial para o parser funcionar
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`[WebSocket] Nova conexão para: ${pathname}`);

  // ---- Roteador de WebSocket ----
  if (pathname.startsWith('/ws/game/')) {
    // --- LÓGICA PARA O JOGO ---
    const pathParts = pathname.split('/');
    const lobbyId = pathParts[3]; // /ws/game/LOBBY_ID

    if (!lobbyId) {
      console.log('[Game] Conexão de jogo sem lobbyId. Fechando.');
      ws.close(1008, 'Lobby ID não fornecido na URL.');
      return;
    }

    console.log(`[Game] Conexão roteada para o Jogo no lobby: ${lobbyId}`);
    gameManager.addPlayer(lobbyId, ws);

    ws.on('message', (message) => {
      gameManager.handleMessage(lobbyId, ws, message.toString());
    });

    ws.on('close', () => {
      console.log(`[Game] Jogador desconectado do Jogo no lobby: ${lobbyId}`);
      gameManager.removePlayer(lobbyId, ws);
    });

    ws.on('error', (error) => {
      console.error(`[Game] Erro no WebSocket (Lobby ${lobbyId}):`, error);
      gameManager.removePlayer(lobbyId, ws);
    });

  } else if (pathname.startsWith('/ws/chat/')) {
    // --- LÓGICA PARA O CHAT ---
    const pathParts = pathname.split('/');
    const lobbyId = pathParts[3];
    const userId = url.searchParams.get('userId');
    const usernameParam = url.searchParams.get('username');

    if (!lobbyId || !userId || !usernameParam) {
      console.log('[Chat] Conexão de chat com parâmetros faltando. Fechando.');
      ws.close(1008, 'Parâmetros lobbyId, userId e username são obrigatórios.');
      return;
    }

    // Decodifica o username que veio da URL
    const username = decodeURIComponent(usernameParam);
    console.log(`[Chat] Conexão roteada para o Chat no lobby: ${lobbyId} por ${username}`);

    // Delega o gerenciamento para o ChatManager
    chatManager.addUser(lobbyId, userId, username, ws);

    ws.on('message', (message) => {
      chatManager.handleMessage(lobbyId, ws, message);
    });

    ws.on('close', () => {
      chatManager.removeUser(lobbyId, ws);
    });

    ws.on('error', (error) => {
      console.error(`[Chat] Erro no WebSocket (Lobby ${lobbyId}):`, error);
      chatManager.removeUser(lobbyId, ws);
    });

  } else {
    // Se a URL não corresponder a nenhum serviço conhecido, feche a conexão.
    console.log(`[WebSocket] Path não reconhecido: ${pathname}. Fechando conexão.`);
    ws.close(1008, 'Endpoint WebSocket inválido.');
  }
});

// ===================================================================
// ==            FIM DA LÓGICA DE WEBSOCKET CENTRALIZADA            ==
// ===================================================================

// Tratamento de erros 404 (deve vir depois das rotas)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// Error handling middleware (deve vir por último)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno no servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Servidor WebSocket ouvindo em ws://localhost:${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

export default app;