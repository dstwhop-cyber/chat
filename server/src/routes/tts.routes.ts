import { Router } from 'express';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';

const router = Router();

router.post('/speak', async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'text is required');

  // Minimal placeholder: return 501 with instructions.
  throw new ApiError(
    HTTP_STATUS.NOT_IMPLEMENTED,
    'TTS is not configured yet. Set up a local TTS engine (e.g. Piper) and then implement server/src/routes/tts.routes.ts.'
  );
});

export default router;
