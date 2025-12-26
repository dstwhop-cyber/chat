declare module 'pino-http' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { Logger } from 'pino';

  interface Options {
    logger?: Logger;
    autoLogging?: boolean | { ignorePaths?: string[] };
    customLogLevel?: (res: ServerResponse, error: Error) => string;
    customSuccessMessage?: (res: ServerResponse) => string;
    customErrorMessage?: (error: Error, res: ServerResponse) => string;
    customAttributeKeys?: Record<string, string>;
    wrapSerializers?: boolean;
    reqCustomProps?: (req: IncomingMessage, res: ServerResponse) => Record<string, any>;
  }

  function pinoHttp(options?: Options): (req: any, res: any, next: (err?: Error) => void) => void;
  
  export = pinoHttp;
}
