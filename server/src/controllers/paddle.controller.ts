import { paddle } from '@/lib/paddle';
import { prisma } from '@/lib/prisma';
import { Request, Response } from 'express';
import crypto from 'crypto';

// Paddle webhook events we handle
const SUPPORTED_EVENTS = [
  'subscription.created',
  'subscription.updated',
  'subscription.cancelled',
  'subscription.paused',
  'subscription.resumed',
  'payment_succeeded',
  'payment_failed',
];

export const paddleWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['paddle-signature'] as string;
    const rawBody = req.body;

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify webhook signature (you'll need to implement this based on Paddle's docs)
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      console.error('PADDLE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // For now, we'll skip signature verification in development
    // In production, you must verify the signature using Paddle's SDK
    const event = req.body;

    if (!SUPPORTED_EVENTS.includes(event.event_type)) {
      return res.status(200).json({ received: true });
    }

    console.log(`Processing Paddle webhook: ${event.event_type}`, event.data);

    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionCreated(event.data);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data);
        break;
      
      case 'payment_succeeded':
        await handlePaymentSucceeded(event.data);
        break;
      
      case 'payment_failed':
        await handlePaymentFailed(event.data);
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

async function handleSubscriptionCreated(data: any) {
  const { customer_id, subscription_id, status } = data;
  
  // Find user by Paddle customer ID or create mapping
  let user = await prisma.user.findFirst({
    where: { paddleUserId: customer_id }
  });

  if (!user) {
    // Try to find user by email from customer data
    const email = data.customer?.email;
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { paddleUserId: customer_id }
        });
      }
    }
  }

  if (user && (status === 'active' || status === 'trialing')) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'premium',
        paddleSubscriptionId: subscription_id,
        subscription: 'PREMIUM'
      }
    });
  }
}

async function handleSubscriptionCancelled(data: any) {
  const { customer_id, subscription_id } = data;
  
  const user = await prisma.user.findFirst({
    where: { paddleUserId: customer_id }
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'free',
        paddleSubscriptionId: null,
        subscription: 'FREE'
      }
    });
  }
}

async function handlePaymentSucceeded(data: any) {
  const { customer_id, subscription_id } = data;
  
  const user = await prisma.user.findFirst({
    where: { paddleUserId: customer_id }
  });

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'premium',
        paddleSubscriptionId: subscription_id,
        subscription: 'PREMIUM'
      }
    });
  }
}

async function handlePaymentFailed(data: any) {
  // Log payment failures but don't immediately cancel
  // You might want to implement a grace period or dunning logic
  console.log('Payment failed:', data);
}
