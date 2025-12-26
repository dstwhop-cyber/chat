import type { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';
import { WS_EVENTS } from '@/constants';
import { logger } from '@/utils/logger';

export const initSocket = (io: Server, prisma: PrismaClient) => {
  io.on(WS_EVENTS.CONNECTION, (socket) => {
    logger.info('Socket connected', { id: socket.id });

    socket.on(WS_EVENTS.DISCONNECT, () => {
      logger.info('Socket disconnected', { id: socket.id });
    });

    // Minimal signaling relay for WebRTC (client not yet wired)
    socket.on(WS_EVENTS.CALL_REQUEST, (payload) => {
      socket.broadcast.emit(WS_EVENTS.CALL_REQUEST, payload);
    });

    socket.on(WS_EVENTS.CALL_ACCEPTED, (payload) => {
      socket.broadcast.emit(WS_EVENTS.CALL_ACCEPTED, payload);
    });

    socket.on(WS_EVENTS.CALL_REJECTED, (payload) => {
      socket.broadcast.emit(WS_EVENTS.CALL_REJECTED, payload);
    });

    socket.on(WS_EVENTS.ICE_CANDIDATE, (payload) => {
      socket.broadcast.emit(WS_EVENTS.ICE_CANDIDATE, payload);
    });

    socket.on(WS_EVENTS.CALL_ENDED, (payload) => {
      socket.broadcast.emit(WS_EVENTS.CALL_ENDED, payload);
    });
  });
};
