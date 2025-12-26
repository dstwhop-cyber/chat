import { Button } from '../components/ui/button';
import { Crown, Star, Zap, Shield } from 'lucide-react';
import { useSubscription } from '../hooks/use-subscription';

export const UpgradeButton = ({ email }: { email?: string }) => {
  const { isPremium, loading, upgradeToPremium } = useSubscription();

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  if (isPremium) {
    return (
      <Button variant="outline" className="gap-2">
        <Crown className="w-4 h-4" />
        Premium Active
      </Button>
    );
  }

  return (
    <Button 
      onClick={() => upgradeToPremium(email)} 
      className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
    >
      <Crown className="w-4 h-4" />
      Upgrade to Premium
    </Button>
  );
};

export const PricingCard = ({ 
  title, 
  price, 
  features, 
  highlighted = false,
  onUpgrade 
}: {
  title: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  onUpgrade?: () => void;
}) => {
  return (
    <div className={`rounded-lg border p-6 ${highlighted ? 'border-purple-500 shadow-lg' : 'border-gray-200'}`}>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div className="text-3xl font-bold mb-4">{price}</div>
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            {feature}
          </li>
        ))}
      </ul>
      {onUpgrade && (
        <Button 
          onClick={onUpgrade}
          className={`w-full ${highlighted ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
          variant={highlighted ? 'default' : 'outline'}
        >
          Get Started
        </Button>
      )}
    </div>
  );
};

export const PricingPage = () => {
  const { upgradeToPremium } = useSubscription();

  const freeFeatures = [
    '50 messages per day',
    'Text-only conversations',
    'Basic AI personalities',
    'Standard response speed'
  ];

  const premiumFeatures = [
    'Unlimited messages',
    'Voice cloning & synthesis',
    'Real-time voice calls',
    'Custom personality training',
    'Priority support',
    'Advanced AI models'
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-600 text-lg">
          Unlock the full potential of your AI companion
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <PricingCard
          title="Free"
          price="$0/month"
          features={freeFeatures}
        />
        
        <PricingCard
          title="Premium"
          price="$9.99/month"
          features={premiumFeatures}
          highlighted={true}
          onUpgrade={upgradeToPremium}
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Why Choose Premium?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <h3 className="font-semibold mb-1">Lightning Fast</h3>
            <p className="text-sm text-gray-600">
              Get responses instantly with priority processing
            </p>
          </div>
          <div className="text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <h3 className="font-semibold mb-1">Exclusive Features</h3>
            <p className="text-sm text-gray-600">
              Voice cloning, real-time calls, and custom personalities
            </p>
          </div>
          <div className="text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <h3 className="font-semibold mb-1">Unlimited Access</h3>
            <p className="text-sm text-gray-600">
              No limits on messages or conversations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
