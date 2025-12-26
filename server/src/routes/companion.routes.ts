import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@/middleware/auth.middleware';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const companions = await prisma.companion.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  res.json(companions);
});

router.get('/:companionId', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { companionId } = req.params;
  const companion = await prisma.companion.findFirst({ where: { id: companionId, userId } });
  if (!companion) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Companion not found');

  res.json(companion);
});

router.post('/', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { name, personality, description, avatarUrl } = req.body as {
    name?: string;
    personality?: string;
    description?: string;
    avatarUrl?: string;
  };

  if (!name) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'name is required');

  const companion = await prisma.companion.create({
    data: {
      userId,
      name,
      personality: personality || 'You are a warm, supportive AI companion.',
      description,
      avatarUrl,
      isDefault: false,
    },
  });

  res.status(HTTP_STATUS.CREATED).json(companion);
});

export default router;
