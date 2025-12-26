/**
 * Universal logger that works in both Node.js and browser environments
 * Provides consistent logging API across different platforms
 */

// Define types for our logger
interface LogLevels {
  info: 'info';
  error: 'error';
  warn: 'warn';
  debug: 'debug';
}

type LogLevel = keyof LogLevels;
type LogMethod = (message: string, meta?: Record<string, unknown>) => void;

// Check if running in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Check if running in Node.js
const isNode = (() => {
  try {
    // Safely check for Node.js environment
    const processExists = typeof process !== 'undefined' && 
                         process !== null && 
                         typeof process === 'object';
    
    if (!processExists) return false;
    
    // Type assertion to access versions safely
    const proc = process as unknown as {
      versions?: { node?: string; [key: string]: unknown };
      [key: string]: unknown;
    };
    
    return Boolean(
      proc.versions && 
      typeof proc.versions === 'object' && 
      'node' in proc.versions
    );
  } catch (e) {
    return false;
  }
})();

// Safe process.env access
const getNodeEnv = (): string => {
  if (!isNode) return 'development';
  try {
    return (process.env?.NODE_ENV as string) || 'development';
  } catch (e) {
    return 'development';
  }
};

// Create a browser-compatible logger instance
const createLogger = () => {
  // Get environment (browser or Node.js)
  const env = isBrowser ? 'browser' : 'node';
  
  // Get current environment (development/production/test)
  const environment = (() => {
    if (isNode && process.env.NODE_ENV) return process.env.NODE_ENV;
    if (isBrowser) {
      // In browsers, check for a global config or use development as default
      const win = window as any;
      return win.ENV?.NODE_ENV || 'development';
    }
    return 'development';
  })();
  
  // Skip logging in test environment
  const shouldLog = environment !== 'test';
  
  // Format log entry consistently
  const formatLog = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    return {
      time: timestamp,
      level: level.toUpperCase(),
      env,
      message,
      ...(meta && Object.keys(meta).length > 0 ? { meta } : {})
    };
  };
  
  // Log to appropriate console method based on level
  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (!shouldLog) return;
    
    const logEntry = formatLog(level, message, meta);
    const logString = JSON.stringify(logEntry, null, environment === 'development' ? 2 : 0);
    
    // Use appropriate console method based on level
    const consoleMethod = console[level] || console.log;
    consoleMethod.call(console, logString);
    
    // In development, also log to the console with colors for better readability
    if (environment === 'development' && isBrowser) {
      const styles: Record<string, string> = {
        error: 'color: #ff4444;',
        warn: 'color: #ffbb33;',
        info: 'color: #33b5e5;',
        debug: 'color: #888888;'
      };
      
      console.groupCollapsed(`%c${level.toUpperCase()}`, styles[level] || '', message);
      if (meta) console.log(meta);
      console.groupEnd();
    }
  };

  return {
    info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
    child: () => createLogger(),
  };
};

// Create logger instance
export const logger = createLogger();

// Request ID generator
const generateRequestId = (): string => {
  try {
    // Try Web Crypto API (browsers and newer Node.js)
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const arr = new Uint8Array(8);
      (crypto as Crypto).getRandomValues(arr);
      return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Try Node.js crypto module (using dynamic import to avoid require type issues)
    if (isNode) {
      try {
        // This is a type-safe way to handle dynamic imports in both CJS and ESM
        const nodeCrypto = (() => {
          try {
            // @ts-ignore - Dynamic import for Node.js module
            return require('crypto');
          } catch (e) {
            return null;
          }
        })();
        
        if (nodeCrypto?.randomBytes && typeof nodeCrypto.randomBytes === 'function') {
          return nodeCrypto.randomBytes(8).toString('hex');
        }
      } catch (e) {
        // Ignore any errors during crypto module loading
      }
    }
    
    // Fallback to Math.random (less secure but always available)
    return Array.from(
      { length: 16 },
      () => Math.floor(Math.random() * 16).toString(16)
    ).join('');
  } catch (e) {
    // Final fallback in case of any errors
    return Math.random().toString(36).substring(2, 15);
  }
};

// HTTP logger middleware
export const httpLogger = {
  logger: createLogger(),
  
  logRequest: (req: any, res: any, next: (err?: Error) => void) => {
    // Skip in browser environment if not in development
    if (isBrowser && process.env.NODE_ENV !== 'development') {
      return next();
    }

    const start = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to the request object
    req.id = requestId;
    
    // Log request start
    logger.info('Request started', {
      type: 'request',
      id: requestId,
      method: req.method || 'GET',
      url: req.url || (isBrowser ? window.location.href : ''),
      headers: isBrowser ? 
        { 'user-agent': window.navigator.userAgent } : 
        req.headers,
    });
    
    // Only patch response.end in Node.js environment
    if (!isBrowser && res && typeof res.end === 'function') {
      const originalEnd = res.end;
      res.end = function(chunk: any, encoding: any, callback: any) {
        const duration = Date.now() - start;
        logger.info('Request completed', {
          type: 'response',
          id: requestId,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          duration: `${duration}ms`,
          'content-type': res.getHeader('content-type'),
        });
        
        return originalEnd.call(this, chunk, encoding, callback);
      };
    }
    
    next();
  },
  
  logError: (err: Error, req: any, res: any, next: (err?: Error) => void) => {
    logger.error('Request error', {
      type: 'error',
      id: req?.id || 'unknown',
      message: err.message,
      stack: (isNode ? process.env.NODE_ENV : 'development') === 'development' ? 
        err.stack : 
        undefined,
    });
    
    if (typeof next === 'function') {
      next(err);
    } else if (isBrowser) {
      // In browser, ensure the error is logged even if next is not available
      console.error('Unhandled error:', err);
    }
  },
  
  // Browser-specific logging for client-side API calls
  logApiCall: (config: {
    method: string;
    url: string;
    params?: any;
    data?: any;
    response?: any;
    error?: any;
    duration: number;
  }) => {
    if (!isBrowser) return;
    
    const { method, url, params, data, response, error, duration } = config;
    const requestId = generateRequestId();
    
    const logData = {
      id: requestId,
      method: method.toUpperCase(),
      url,
      ...(params && { params }),
      ...(data && { requestBody: data }),
      duration: `${duration}ms`,
    };
    
    if (error) {
      logger.error('API Error', {
        ...logData,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        },
      });
    } else {
      logger.info('API Response', {
        ...logData,
        status: response?.status,
        response: response?.data,
      });
    }
  }
};

// Handle process events in a type-safe way
const setupProcessHandlers = () => {
  // Type guard to check if process has 'on' method
  const hasProcessOn = (p: any): p is { on: Function } => 
    p && typeof p.on === 'function';

  // Type guard to check if process has 'env' property
  const hasProcessEnv = (p: any): p is { env: { NODE_ENV?: string } } => 
    p && typeof p.env === 'object';

  // Define the process mock type
  type ProcessMock = {
    env: { NODE_ENV?: string; [key: string]: any };
    on: (event: string, listener: (...args: any[]) => void) => any;
    exit: (code?: number) => never;
    nextTick: (callback: (...args: any[]) => void, ...args: any[]) => void;
  };

  // Get the current process or a mock for non-Node environments
  const currentProcess: ProcessMock = (() => {
    if (typeof process !== 'undefined' && process) {
      return process as unknown as ProcessMock;
    }
    
    // Mock implementation for non-Node environments
    return {
      env: { NODE_ENV: 'development' },
      on: () => ({}),
      exit: (code?: number): never => {
        if (typeof window !== 'undefined') {
          // In browser, just log the exit
          console.log(`Process would exit with code: ${code}`);
        }
        // This is a type-only assertion to satisfy TypeScript
        return undefined as never;
      },
      nextTick: (callback: (...args: any[]) => void, ...args: any[]) => {
        setTimeout(() => callback(...args), 0);
      }
    };
  })();

  // Only set up handlers if we have a proper process object
  if (hasProcessOn(currentProcess)) {
    // Handle uncaught exceptions
    currentProcess.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', { error });
      if (hasProcessEnv(currentProcess) && currentProcess.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });

    // Handle unhandled promise rejections
    currentProcess.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection', { reason });
      if (hasProcessEnv(currentProcess) && currentProcess.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });
  }
};

// Initialize process handlers
setupProcessHandlers();

export default logger;
