

import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // Importando WebSocket também para tipagem
import cors from 'cors';
import { URL } from 'url';

import authRoutes from './routes/auth.routes';
import lobbyRoutes from './routes/lobby.routes';
import historyRoutes from './routes/history.routes';
import sessionRoutes from './routes/session.routes';
import { GameManager } from './game/GameManager';
import { chatManager } from './chat';

dotenv.config();

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/auth', authRoutes);
app.use('/lobbys', lobbyRoutes);
app.use('/history', historyRoutes);
app.use('/session', sessionRoutes);


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});


const server = http.createServer(app);


const wss = new WebSocketServer({ server });
const gameManager = new GameManager();
interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
}

function heartbeat(this: WebSocket) {
  (this as AliveWebSocket).isAlive = true;
}

wss.on('connection', async (ws: AliveWebSocket, req) => {
  ws.isAlive = true;

  ws.on('pong', heartbeat);


  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`[WebSocket] Nova conexão para: ${pathname}`);


  if (pathname.startsWith('/ws/game/')) {

    const pathParts = pathname.split('/');
    const lobbyId = pathParts[3];

    if (!lobbyId) {
      console.log('[Game] Conexão de jogo sem lobbyId. Fechando.');
      ws.close(1008, 'Lobby ID não fornecido na URL.');
      return;
    }

    console.log(`[Game] Conexão roteada para o Jogo no lobby: ${lobbyId}`);
    
    try {
      await gameManager.addPlayer(lobbyId, ws);
    } catch (error: any) {
      console.error(`[Game] Falha ao adicionar jogador no GameManager: ${error.message}`);
      if (ws.readyState === WebSocket.OPEN) {
          ws.close(1011, 'Falha ao inicializar o jogo.');
      }
      return;
    }

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

    const pathParts = pathname.split('/');
    const lobbyId = pathParts[3];
    const userId = url.searchParams.get('userId');
    const username = url.searchParams.get('username');

    if (!lobbyId || !userId || !username) {
        console.log('[Chat] Conexão de chat com parâmetros faltando. Fechando.');
        ws.close(1008, 'Parâmetros (lobbyId, userId, username) são necessários.');
        return;
    }
    
    console.log(`[Chat] Conexão roteada para o Chat no lobby: ${lobbyId}`);
    

    chatManager.handleConnection(ws as any, lobbyId, userId, username);

  } else {

    console.log(`[WebSocket] Path não reconhecido: ${pathname}. Fechando conexão.`);
    ws.close(1008, 'Endpoint WebSocket inválido.');
  }
});


const interval = setInterval(() => {
  wss.clients.forEach((wsClient) => {
    const ws = wsClient as AliveWebSocket;


    if (ws.isAlive === false) {
      console.log('[Heartbeat] Conexão inativa detectada. Encerrando.');
      return ws.terminate(); 
    }


    ws.isAlive = false;
    ws.ping();
  });
}, 30000); 


wss.on('close', () => {
  clearInterval(interval);
});



app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno no servidor' });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Servidor WebSocket ouvindo em ws://localhost:${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

export default app;