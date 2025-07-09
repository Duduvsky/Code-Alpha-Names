// src/app.ts

import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // Importando WebSocket também para tipagem
import cors from 'cors';
import { URL } from 'url';

// Importe suas rotas e os gerenciadores de WebSocket
import authRoutes from './routes/auth.routes';
import lobbyRoutes from './routes/lobby.routes';
import historyRoutes from './routes/history.routes';
import { GameManager } from './game/GameManager';
import { chatManager } from './chat';

dotenv.config();

const app = express();

// Configuração CORS
const allowedOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://equipe01.alphaedtech.org.br'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/auth', authRoutes);
app.use('/lobbys', lobbyRoutes);
app.use('/history', historyRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Criar servidor HTTP a partir do Express
const server = http.createServer(app);

// ===================================================================
// ==           INÍCIO DA LÓGICA DE WEBSOCKET CENTRALIZADA          ==
// ===================================================================

const wss = new WebSocketServer({ server });
const gameManager = new GameManager();
// O chatManager já é um singleton importado.

// --- LÓGICA DE HEARTBEAT (PING/PONG) PARA MANTER CONEXÕES VIVAS ---
// Estendemos a interface WebSocket para adicionar a flag 'isAlive'
interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
}

// Função que será chamada quando um 'pong' for recebido, marcando a conexão como viva.
function heartbeat(this: WebSocket) {
  (this as AliveWebSocket).isAlive = true;
}

wss.on('connection', async (ws: AliveWebSocket, req) => {
  // Configuração inicial do Heartbeat para esta nova conexão
  ws.isAlive = true;
  // O navegador responde automaticamente aos 'pings' do servidor com 'pongs'.
  // Aqui, apenas dizemos o que fazer quando um 'pong' chega: chamar a função heartbeat.
  ws.on('pong', heartbeat);

  // Lógica de roteamento da conexão
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log(`[WebSocket] Nova conexão para: ${pathname}`);

  // ---- Roteador de WebSocket ----
  if (pathname.startsWith('/ws/game/')) {
    // --- LÓGICA PARA O JOGO ---
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
    // --- LÓGICA PARA O CHAT ---
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
    
    // Passa a conexão para o chatManager cuidar de tudo (adicionar a sala, listeners, etc.)
    // O cast `as any` é usado pois adicionamos propriedades customizadas no objeto `ws` dentro do chatManager
    chatManager.handleConnection(ws as any, lobbyId, userId, username);

  } else {
    // Se a URL não corresponder a nenhum serviço conhecido, feche a conexão.
    console.log(`[WebSocket] Path não reconhecido: ${pathname}. Fechando conexão.`);
    ws.close(1008, 'Endpoint WebSocket inválido.');
  }
});

// --- VERIFICADOR DE HEARTBEAT GLOBAL ---
// A cada 30 segundos, verificamos todas as conexões para remover as que estão "mortas".
const interval = setInterval(() => {
  wss.clients.forEach((wsClient) => {
    const ws = wsClient as AliveWebSocket;

    // Se a flag `isAlive` for falsa, a conexão não respondeu ao último ping.
    // Consideramos a conexão "morta" e a encerramos.
    if (ws.isAlive === false) {
      console.log('[Heartbeat] Conexão inativa detectada. Encerrando.');
      return ws.terminate(); // terminate() fecha a conexão imediatamente, sem cerimônia.
    }

    // Se a conexão estava viva, nós a marcamos como "possivelmente morta" para o próximo ciclo
    // e enviamos um 'ping'. Se ela responder com um 'pong', a flag voltará a ser 'true'.
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // 30 segundos é um intervalo seguro e comum.

// Limpa o intervalo de verificação quando o servidor é fechado.
wss.on('close', () => {
  clearInterval(interval);
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