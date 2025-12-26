import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

// Global setup for tests
declare global {
  // eslint-disable-next-line no-var
  var __TEST_DB__: PrismaClient;
  // eslint-disable-next-line no-var
  var __REDIS_CLIENT__: ReturnType<typeof createClient>;
}

beforeAll(async () => {
  // Set up test database
  global.__TEST_DB__ = prisma;
  
  // Clear test data
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  
  // Set up Redis for rate limiting
  global.__REDIS_CLIENT__ = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  
  await global.__REDIS_CLIENT__.connect();
});

afterAll(async () => {
  // Clean up after tests
  await prisma.$disconnect();
  await global.__REDIS_CLIENT__.disconnect();
});

// Mock logger to prevent console spam during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  httpLogger: {
    logRequest: jest.fn(),
    logError: jest.fn(),
  },
}));

// Mock file uploads
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => next(),
    array: () => (req: any, res: any, next: any) => next(),
  });
  multer.memoryStorage = () => jest.fn();
  return multer;
});

// Mock rate limiting
jest.mock('express-rate-limit', () => {
  return () => (req: any, res: any, next: any) => next();
});
