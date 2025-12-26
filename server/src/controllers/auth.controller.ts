import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, User, SubscriptionTier } from '@prisma/client';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '@/utils/jwt';
import { logger } from '@/utils/logger';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Extend the User type to include the password field for internal use
type UserWithPassword = User & {
  password?: string;
};

const prisma = new PrismaClient();

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  avatar?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface UpdateProfileBody {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
  avatar?: string;
}

interface AuthResponse {
  user: Omit<User, 'password' | 'refreshTokens'>;
  accessToken: string;
  refreshToken?: string;
}

export const register = async (req: Request<{}, {}, RegisterBody>, res: Response<AuthResponse>) => {
  try {
    const { email, password, name, avatar } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(HTTP_STATUS.CONFLICT, 'Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
name,
        isGuest: false,
        avatarUrl: avatar,
        subscription: SubscriptionTier.FREE,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isGuest: true,
        subscription: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(HTTP_STATUS.CREATED).json({
      user,
      accessToken,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Registration failed');
  }
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response<AuthResponse>) => {
  try {
    const { email, password } = req.body as LoginBody;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isGuest: true,
        subscription: true,
        createdAt: true,
      },
    });

    // Check if user exists and password is correct
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      user: userWithoutPassword,
      accessToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Login failed');
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Try to get refresh token from cookies first, then from body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Invalid refresh token');
    }

    // Find the token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.user.id !== decoded.userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Refresh token not found');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token expired');
    }

    // Generate new tokens
    const user = storedToken.user;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token in database
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Set new refresh token in HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to refresh token');
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refresh token is required');
    }

    // Verify the refresh token to get the user ID
    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded) {
      // Delete all refresh tokens for this user
      await prisma.refreshToken.deleteMany({
        where: { 
          userId: decoded.userId,
          token: refreshToken,
        },
      });
    }

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    // Even if there's an error, we still want to clear the cookie
    res.clearCookie('refreshToken');
    
    logger.error('Logout error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Logout failed');
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // The user should be attached to the request by the auth middleware
    if (!req.user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
    }

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isGuest: true,
        subscription: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        companions: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            description: true,
            isPublic: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            conversations: true,
            companions: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Update last login time
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { lastLoginAt: new Date() },
    });

    res.json(user);
  } catch (error) {
    logger.error('Get current user error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to get current user');
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
  }

  try {
    const { name, email, password, currentPassword, avatar } = req.body as UpdateProfileBody;
    const updateData: any = {};

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { password: true, email: true },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Update name if provided
    if (name) updateData.name = name;
    
    // Update avatar if provided
    if (avatar) updateData.avatarUrl = avatar;

    // Update email if provided
    if (email && email !== user.email) {
      // Check if new email is already in use
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Email already in use');
      }
      updateData.email = email;
    }

    // Update password if current password is provided
    if (password) {
      if (!currentPassword) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Current password is required to change password');
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Current password is incorrect');
      }

      // Hash new password
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isGuest: true,
        subscription: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    logger.error('Update profile error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to update profile');
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');
  }

  try {
    const { password } = req.body;
    
    if (!password) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Password is required to delete account');
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { password: true },
    });

    if (!user) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Incorrect password');
    }

    // Delete user (cascading deletes will handle related records)
    await prisma.user.delete({
      where: { id: req.user.userId },
    });

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    logger.error('Delete account error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to delete account');
  }
};

export const createGuestUser = async (req: Request, res: Response) => {
  const transaction = [];
  
  try {
    // Generate a random guest email and password
    const guestId = uuidv4().substring(0, 8);
    const email = `guest_${guestId}@example.com`;
    const password = uuidv4();

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Create guest user
      const user = await prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash(password, 10),
          name: `Guest-${guestId}`,
          isGuest: true,
          subscription: SubscriptionTier.FREE,
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isGuest: true,
          subscription: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Save refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for guest
        },
      });

      return { user, accessToken, refreshToken };
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.status(HTTP_STATUS.CREATED).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (error) {
    logger.error('Create guest user error:', error);
    
    // Clean up any partially created data in case of error
    try {
      await Promise.all(transaction.map((op) => op.rollback?.()));
    } catch (rollbackError) {
      logger.error('Error during guest user creation rollback:', rollbackError);
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to create guest user');
  }
};

export const checkEmailAvailability = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email is required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    res.json({ available: !user });
  } catch (error) {
    logger.error('Check email availability error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to check email availability');
  }
};
