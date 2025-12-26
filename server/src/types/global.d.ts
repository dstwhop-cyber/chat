// Type definitions for Node.js
interface ProcessEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  JWT_SECRET: string;
  DATABASE_URL: string;
  REDIS_URL?: string;
  PORT?: string;
}

// Extend the global Error constructor
interface ErrorConstructor {
  captureStackTrace(error: Error, constructorOpt?: Function): void;
}

// Global variables
declare const process: {
  env: ProcessEnv;
  nextTick(callback: (...args: any[]) => void, ...args: any[]): void;
  exit(code?: number): never;
};

declare namespace NodeJS {
  interface Global {
    __TEST_DB__: any;
    __REDIS_CLIENT__: any;
  }
}

// Add global variables
declare const __TEST_DB__: any;
declare const __REDIS_CLIENT__: any;
