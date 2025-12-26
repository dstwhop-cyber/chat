import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { GROQ_MODELS } from '@/lib/groq-models';

const router = Router();

// GET /api/models - Get available AI models
router.get('/models', authenticate, async (req, res) => {
  try {
    const models = GROQ_MODELS.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      contextWindow: model.contextWindow,
      speed: model.speed,
      cost: model.cost
    }));

    res.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

export default router;
