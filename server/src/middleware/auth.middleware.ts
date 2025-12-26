import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';
import { verifyAccessToken, type TokenPayload } from '@/utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const prisma = new PrismaClient();

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'No token provided');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isGuest: true,
        subscription: true,
      },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not found');
    }

    // Attach user to request object
    req.user = {
      userId: user.id,
      email: user.email,
      isGuest: user.isGuest,
      subscription: String(user.subscription),
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const checkSubscription = (requiredTier: string = 'free') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userTier = req.user?.subscription || 'free';
      
      // Define tier hierarchy
      const tierHierarchy: Record<string, number> = {
        free: 0,
        premium: 1,
        'premium_plus': 2
      };

      if ((tierHierarchy[userTier] || 0) < tierHierarchy[requiredTier]) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          `This feature requires ${requiredTier} subscription or higher`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const guestOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isGuest) {
    return next(new ApiError(HTTP_STATUS.FORBIDDEN, 'This route is for guest users only'));
  }
  next();
};

export const authenticatedOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.isGuest) {
    return next(new ApiError(HTTP_STATUS.FORBIDDEN, 'Guest users cannot access this route'));
  }
  next();
};

export const rateLimit = (limit: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    // Get or create request counter for this IP
    const requestInfo = requests.get(ip) || { count: 0, resetTime: now + windowMs };
    
    // Check rate limit
    if (requestInfo.count >= limit) {
      const retryAfter = Math.ceil((requestInfo.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return next(
        new ApiError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          `Too many requests, please try again in ${retryAfter} seconds`
        )
      );
    }

    // Increment counter
    requestInfo.count++;
    requests.set(ip, requestInfo);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(limit - requestInfo.count),
      'X-RateLimit-Reset': String(Math.ceil(requestInfo.resetTime / 1000)),
    });

    next();
  };
};
