import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';

// Rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'Too many requests from this IP, please try again after 15 minutes'
      )
    );
  },
});

// Rate limiting for public APIs
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'Too many requests from this IP, please try again later'
      )
    );
  },
});

// Rate limiting for sensitive actions (password reset, etc.)
export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'Too many attempts, please try again in an hour'
      )
    );
  },
});

// Rate limiting for guest accounts
export const guestAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 guest accounts per hour per IP
  keyGenerator: (req) => {
    return req.ip; // Use IP address for guest account limiting
  },
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'Too many guest accounts created from this IP, please try again later'
      )
    );
  },
});

// Rate limiting for message sending
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  keyGenerator: (req) => {
    // Use user ID for authenticated users, IP for guests
    return req.user ? req.user.id : req.ip;
  },
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'Message sending rate limit exceeded, please slow down'
      )
    );
  },
});

// Rate limiting for API key based requests
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour per API key
  keyGenerator: (req) => {
    return req.headers['x-api-key'] as string || req.ip;
  },
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'API rate limit exceeded, please try again later or upgrade your plan'
      )
    );
  },
});

// Rate limiting for search endpoints
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new TooManyRequestsError(
        'Too many search requests, please try again in a minute'
      )
    );
  },
});
