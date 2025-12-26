// Temporary type declarations for missing modules
declare module 'axios' {
  export interface AxiosInstance {
    (config: any): Promise<any>;
    get(url: string, config?: any): Promise<any>;
    post(url: string, data?: any, config?: any): Promise<any>;
    put(url: string, data?: any, config?: any): Promise<any>;
    delete(url: string, config?: any): Promise<any>;
    defaults: {
      baseURL: string;
    };
    interceptors: {
      request: {
        use(onFulfilled?: (config: any) => any, onRejected?: (error: any) => any): void;
      };
      response: {
        use(onFulfilled?: (response: any) => any, onRejected?: (error: any) => any): void;
      };
    };
  }
  
  export interface AxiosRequestConfig {
    headers?: any;
    [key: string]: any;
  }
  
  export interface InternalAxiosRequestConfig extends AxiosRequestConfig {}
  
  export interface AxiosResponse {
    data: any;
    status: number;
    statusText: string;
    headers: any;
  }
  
  export class AxiosError extends Error {
    response?: AxiosResponse;
    message: string;
    config?: any;
  }
  
  export function create(config?: any): AxiosInstance;
  
  const axios: AxiosInstance & {
    create: (config?: any) => AxiosInstance;
    post: (url: string, data?: any, config?: any) => Promise<any>;
  };
  export default axios;
}

declare module 'sonner' {
  export const toast: {
    error(message: string): void;
    success(message: string): void;
    info(message: string): void;
  };
}
