import { Paddle } from '@paddle/paddle-node-sdk';

let paddleInstance: Paddle | null = null;

export const initializePaddle = () => {
  if (!process.env.PADDLE_API_KEY) {
    console.warn('PADDLE_API_KEY not found in environment variables');
    return null;
  }

  try {
    paddleInstance = new Paddle(process.env.PADDLE_API_KEY, {
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });
    
    console.log('Paddle SDK initialized successfully');
    return paddleInstance;
  } catch (error) {
    console.error('Failed to initialize Paddle SDK:', error);
    return null;
  }
};

export const paddle = () => {
  if (!paddleInstance) {
    throw new Error('Paddle SDK not initialized. Call initializePaddle() first.');
  }
  return paddleInstance;
};
