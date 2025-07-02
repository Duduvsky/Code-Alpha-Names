import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { Server as WebSocketServer } from 'ws';
import authRoutes from './routes/auth.routes';
import lobbyRoutes from './routes/lobby.routes';
import cors from 'cors';
import { setupChatWebSocket } from './chat';

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

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/lobbys', lobbyRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Tratamento de erros 404
app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint não encontrado' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno no servidor' });
});

// Criar servidor HTTP
const server = http.createServer(app);

// Configurar WebSocket para chat
setupChatWebSocket(server);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

export default app;