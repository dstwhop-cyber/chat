declare module 'pino' {
  interface Logger {
    info: (obj: any, msg?: string, ...args: any[]) => void;
    error: (obj: any, msg?: string, ...args: any[]) => void;
    warn: (obj: any, msg?: string, ...args: any[]) => void;
    debug: (obj: any, msg?: string, ...args: any[]) => void;
    child: (bindings: Record<string, any>) => Logger;
  }

  const pino: (options?: any) => Logger;
  export = pino;
}
