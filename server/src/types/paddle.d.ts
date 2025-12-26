// Paddle environment types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PADDLE_API_KEY?: string;
      PADDLE_WEBHOOK_SECRET?: string;
      PADDLE_PRICE_ID?: string;
    }
  }
}

export {};
