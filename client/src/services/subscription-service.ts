import apiClient from '../lib/api-client';

export interface SubscriptionStatus {
  isPremium: boolean;
  subscriptionStatus: string;
  subscriptionTier: string;
  paddleSubscriptionId?: string;
  paddleUserId?: string;
}

export const subscriptionService = {
  // Get user subscription status
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const { data } = await apiClient.get('/paddle/status');
    return data;
  },

  // Open Paddle checkout for premium subscription
  openPaddleCheckout(priceId: string, email?: string) {
    // Load Paddle.js if not already loaded
    if (!window.Paddle) {
      this.loadPaddleScript().then(() => {
        this.initCheckout(priceId, email);
      });
    } else {
      this.initCheckout(priceId, email);
    }
  },

  loadPaddleScript(): Promise<void> {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.onload = () => {
        // Initialize Paddle with your environment
        window.Paddle.Initialize({
          environment: import.meta.env.MODE === 'production' ? 'production' : 'sandbox',
          token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '', // Optional client token
        });
        resolve();
      };
      document.head.appendChild(script);
    });
  },

  initCheckout(priceId: string, email?: string) {
    const checkoutOptions: any = {
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
    };

    if (email) {
      checkoutOptions.customer = {
        email: email,
      };
    }

    window.Paddle.Checkout.open(checkoutOptions);
  },
};

// Extend Window interface for Paddle
declare global {
  interface Window {
    Paddle: {
      Initialize: (options: { environment: 'production' | 'sandbox'; token?: string }) => void;
      Checkout: {
        open: (options: any) => void;
      };
    };
  }
}
