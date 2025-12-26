import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';

export const requirePremium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    });

    if (!user || user.subscriptionStatus !== 'premium') {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        message: 'This feature is only available for premium users'
      });
    }

    next();
  } catch (error) {
    console.error('Premium check error:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};

export const checkMessageLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Premium users have unlimited messages
    if (user.subscriptionStatus === 'premium') {
      return next();
    }

    // Check daily message limit for free users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const messageCount = await prisma.message.count({
      where: {
        userId: userId,
        isFromUser: true,
        createdAt: {
          gte: today
        }
      }
    });

    if (messageCount >= 50) {
      return res.status(429).json({ 
        error: 'Daily message limit exceeded',
        message: 'Free users can send 50 messages per day. Upgrade to Premium for unlimited messages.',
        limit: 50,
        current: messageCount
      });
    }

    next();
  } catch (error) {
    console.error('Message limit check error:', error);
    res.status(500).json({ error: 'Failed to check message limit' });
  }
};
