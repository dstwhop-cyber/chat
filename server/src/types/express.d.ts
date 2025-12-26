declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';
  
  interface Request extends IncomingMessage {
    id?: string;
    log?: any;
    user?: any;
    body?: any;
    params?: any;
    query?: any;
  }

  interface Response extends ServerResponse {
    err?: any;
    status: (code: number) => Response;
    json: (body: any) => Response;
    send: (body?: any) => Response;
  }

  interface NextFunction {
    (err?: any): void;
  }

  type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
  
  interface Application {
    use: (middleware: any) => void;
    listen: (port: number, callback?: () => void) => void;
  }

  interface Express {
    (): Application;
    Router: () => any;
  }

  const express: Express;
  export = express;
}
