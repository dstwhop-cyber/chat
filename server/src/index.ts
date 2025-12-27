import 'dotenv/config';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { errorHandler, notFound } from '@/middleware/error.middleware';
import authRoutes from '@/routes/auth.routes';
import chatRoutes from '@/routes/chat.routes';
import companionRoutes from '@/routes/companion.routes';
import ttsRoutes from '@/routes/tts.routes';
import paddleRoutes from '@/routes/paddle.routes';
import modelsRoutes from '@/routes/models.routes';
import { initSocket } from '@/socket';
import { logger } from '@/utils/logger';
import { initializePaddle } from '@/lib/paddle';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const server = http.createServer(app);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Prisma
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // In production, allow same origin and development origins
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!origin || origin === process.env.RENDER_EXTERNAL_URL)) {
      return callback(null, true);
    }
    const allowed = [frontendUrl, 'http://localhost:5173'];
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));

// Serve static files from React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

// Initialize Socket.IO
initSocket(io, prisma);

// Initialize Paddle
initializePaddle();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/companions', companionRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/paddle', paddleRoutes);
app.use('/api/models', modelsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// 404 handler for API routes only in development
if (process.env.NODE_ENV !== 'production') {
  app.use(notFound);
}

// Error handler
app.use(errorHandler);

// Graceful shutdown
const shutdown = async () => {
  try {
    await prisma.$disconnect();
  } catch (e) {
    logger.error('Error disconnecting prisma', e);
  }
};

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { app, server };
