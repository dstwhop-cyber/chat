import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/utils/error';
import { logger } from '@/utils/logger';

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, `Not Found - ${req.originalUrl}`));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiErr = err instanceof ApiError
    ? err
    : new ApiError(500, (err as any)?.message || 'Internal Server Error');

  if (process.env.NODE_ENV === 'development') {
    logger.error('Unhandled error', {
      message: (err as any)?.message,
      stack: (err as any)?.stack,
    });
  }

  res.status(apiErr.statusCode || 500).json({
    success: false,
    message: apiErr.message,
    data: apiErr.data || null,
    ...(process.env.NODE_ENV === 'development' ? { stack: (err as any)?.stack } : {}),
  });
};
