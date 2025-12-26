import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '@/constants';
import { ApiError } from './error';

export interface TokenPayload {
  userId: string;
  email: string;
  isGuest: boolean;
  subscription: string;
}

export const generateAccessToken = (user: {
  id: string;
  email: string;
  isGuest: boolean;
  subscription: string;
}): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    isGuest: user.isGuest,
    subscription: user.subscription,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
};

export const generateRefreshToken = (user: {
  id: string;
  email: string;
  isGuest: boolean;
  subscription: string;
}): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    isGuest: user.isGuest,
    subscription: user.subscription,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Token expired');
    }
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token');
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token expired');
    }
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid refresh token');
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
};
