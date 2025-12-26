import { Router } from 'express';
import { paddleWebhookHandler } from '@/controllers/paddle.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { prisma } from '@/lib/prisma';

const router = Router();

// Webhook endpoint (no auth required - Paddle calls this directly)
router.post('/webhook', paddleWebhookHandler);

// Protected endpoint to get user subscription status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscription: true,
        paddleSubscriptionId: true,
        paddleUserId: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      isPremium: user.subscriptionStatus === 'premium',
      subscriptionStatus: user.subscriptionStatus,
      subscriptionTier: user.subscription,
      paddleSubscriptionId: user.paddleSubscriptionId,
      paddleUserId: user.paddleUserId,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
