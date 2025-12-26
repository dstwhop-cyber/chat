export class ApiError extends Error {
  statusCode: number;
  data: any;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    data: any = null,
    isOperational = true,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, data?: any) {
    return new ApiError(400, message, data);
  }

  static unauthorized(message = 'Unauthorized', data?: any) {
    return new ApiError(401, message, data);
  }

  static forbidden(message = 'Forbidden', data?: any) {
    return new ApiError(403, message, data);
  }

  static notFound(message = 'Not Found', data?: any) {
    return new ApiError(404, message, data);
  }

  static conflict(message = 'Conflict', data?: any) {
    return new ApiError(409, message, data);
  }

  static tooManyRequests(message = 'Too Many Requests', data?: any) {
    return new ApiError(429, message, data);
  }

  static internal(message = 'Internal Server Error', data?: any) {
    return new ApiError(500, message, data, false);
  }

  static notImplemented(message = 'Not Implemented', data?: any) {
    return new ApiError(501, message, data, false);
  }

  static serviceUnavailable(message = 'Service Unavailable', data?: any) {
    return new ApiError(503, message, data, false);
  }
}

export const errorHandler = (
  err: any,
  req: any,
  res: any,
  next: any
) => {
  // Default error structure
  const error = {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error',
    data: err.data || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    error.message = 'Validation failed';
    error.statusCode = 422;
    error.data = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    // Unique constraint violation
    error.message = 'A record with this data already exists';
    error.statusCode = 409;
  }

  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
    });
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    data: error.data,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const notFound = (req: any, res: any, next: any) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};
