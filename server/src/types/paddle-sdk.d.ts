// Temporary type declarations for Paddle SDK until npm install
declare module '@paddle/paddle-node-sdk' {
  export class Paddle {
    constructor(apiKey: string, options?: { environment?: 'production' | 'sandbox' });
  }
}
