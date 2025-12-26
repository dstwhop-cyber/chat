import { Router } from 'express';
import { body, query } from 'express-validator';
import { validateRequest } from '@/middleware/validation.middleware';
import * as authController from '@/controllers/auth.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { upload } from '@/middleware/upload.middleware';
import { RATE_LIMIT } from '@/constants';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Check email availability
router.get(
  '/check-email',
  [
    query('email').isEmail().normalizeEmail(),
    validateRequest,
  ],
  authController.checkEmailAvailability
);

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('name').trim().notEmpty().isLength({ min: 2, max: 50 }),
    body('avatar').optional().isURL(),
    validateRequest,
  ],
  authController.register
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validateRequest,
  ],
  authController.login
);

// Refresh token
router.post(
  '/refresh-token',
  [
    body('refreshToken')
      .optional()
      .isJWT()
      .withMessage('Invalid refresh token format'),
    validateRequest,
  ],
  authController.refreshToken
);

// Refresh token (alias for older clients)
router.post(
  '/refresh',
  [
    body('refreshToken')
      .optional()
      .isJWT()
      .withMessage('Invalid refresh token format'),
    validateRequest,
  ],
  authController.refreshToken
);

// Logout
router.post(
  '/logout',
  [
    body('refreshToken')
      .optional()
      .isJWT()
      .withMessage('Invalid refresh token format'),
    validateRequest,
  ],
  authController.logout
);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Update user profile
router.patch(
  '/me',
  [
    authenticate,
    upload.single('avatar'),
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('currentPassword')
      .if(body('password').exists())
      .notEmpty()
      .withMessage('Current password is required to change password'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    validateRequest,
  ],
  authController.updateProfile
);

// Delete user account
router.delete(
  '/me',
  [
    authenticate,
    body('password').notEmpty().withMessage('Password is required to delete account'),
    validateRequest,
  ],
  authController.deleteAccount
);

// Create guest user
router.post(
  '/guest',
  [
    // Rate limiting for guest account creation
    rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // limit each IP to 10 guest accounts per hour
      message: 'Too many guest accounts created from this IP, please try again later',
    }),
  ],
  authController.createGuestUser
);

export default router;
