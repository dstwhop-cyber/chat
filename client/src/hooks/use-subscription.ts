import { useState, useEffect } from 'react';
import { subscriptionService, SubscriptionStatus } from '../services/subscription-service';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const status = await subscriptionService.getSubscriptionStatus();
        setSubscription(status);
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const upgradeToPremium = (email?: string) => {
    const priceId = import.meta.env.VITE_PADDLE_PRICE_ID || 'your_price_id_here';
    subscriptionService.openPaddleCheckout(priceId, email);
  };

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error('Failed to refresh subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    loading,
    isPremium: subscription?.isPremium || false,
    upgradeToPremium,
    refreshStatus,
  };
};
