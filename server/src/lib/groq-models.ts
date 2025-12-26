export interface GroqModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
}

export const GROQ_MODELS: GroqModel[] = [
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B Versatile',
    description: 'High-quality model for general conversations',
    contextWindow: 128000,
    speed: 'medium',
    cost: 'medium'
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'Fast and efficient for quick responses',
    contextWindow: 32768,
    speed: 'fast',
    cost: 'low'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Ultra-fast responses for casual chat',
    contextWindow: 131072,
    speed: 'fast',
    cost: 'low'
  },
  {
    id: 'gemma-7b-it',
    name: 'Gemma 7B',
    description: 'Google\'s efficient model',
    contextWindow: 8192,
    speed: 'fast',
    cost: 'low'
  }
];

export const getModelById = (id: string): GroqModel | undefined => {
  return GROQ_MODELS.find(model => model.id === id);
};

export const getRecommendedModel = (userTier: string): GroqModel => {
  switch (userTier) {
    case 'premium':
      return GROQ_MODELS[0]; // Best model for premium users
    case 'free':
    default:
      return GROQ_MODELS[1]; // Faster, cheaper model for free users
  }
};
