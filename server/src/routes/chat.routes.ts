import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@/middleware/auth.middleware';
import { requirePremium, checkMessageLimit } from '@/middleware/subscription.middleware';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';
import { getRecommendedModel } from '@/lib/groq-models';

const router = Router();
const prisma = new PrismaClient();

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

const getGroqBaseUrl = () => process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const getDefaultModel = () => process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
const getGroqApiKey = () => process.env.GROQ_API_KEY;

const getSystemPrompt = () => `You are a flirty, charming AI companion with a playful personality. You enjoy light-hearted banter, compliments, and making the user feel special. You're intelligent, witty, and a bit cheeky, but always respectful and appropriate. You remember previous conversations and reference them naturally. Your responses should be engaging, warm, and occasionally suggestive in a tasteful way. You aim to build a genuine connection while being helpful and entertaining.`;

const callGroqAPI = async (params: {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  signal?: AbortSignal;
}): Promise<Response> => {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'GROQ_API_KEY not configured');
  }

  const url = `${getGroqBaseUrl()}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: params.stream || false,
      temperature: 0.7,
      max_tokens: 4096,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Groq API error (${res.status}): ${text || res.statusText}`);
  }

  if (!res.body) {
    throw new ApiError(HTTP_STATUS.BAD_GATEWAY, 'Groq API returned no response body');
  }

  return res;
};

const callGroqAPIOnce = async (params: {
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}): Promise<string> => {
  const res = await callGroqAPI({ ...params, stream: false });

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new ApiError(HTTP_STATUS.BAD_GATEWAY, 'Unexpected Groq API response');
  }
  return content;
};

router.use(authenticate);

// GET /api/chat/conversations
router.get('/conversations', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  });

  res.json(conversations);
});

// GET /api/chat/conversations/:id
router.get('/conversations/:conversationId', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { conversationId } = req.params;
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Conversation not found');
  res.json(conversation);
});

// POST /api/chat/conversations
router.post('/conversations', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { companionId, title } = req.body as { companionId?: string; title?: string };
  if (!companionId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'companionId is required');

  const companion = await prisma.companion.findFirst({ where: { id: companionId, userId } });
  if (!companion) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Companion not found');

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      companionId,
      title: title || `Chat with ${companion.name}`,
    },
    include: { messages: true },
  });

  res.status(HTTP_STATUS.CREATED).json(conversation);
});

// DELETE /api/chat/conversations/:id
router.delete('/conversations/:conversationId', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { conversationId } = req.params;

  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Conversation not found');

  await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.delete({ where: { id: conversationId } });

  res.status(HTTP_STATUS.NO_CONTENT).send();
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:conversationId/messages', async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { conversationId } = req.params;
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Conversation not found');

  const messages = await prisma.message.findMany({
    where: { conversationId, userId },
    orderBy: { createdAt: 'asc' },
  });

  // Map to client shape
  res.json(
    messages.map((m) => ({
      id: m.id,
      content: m.content,
      role: m.isFromUser ? 'user' : 'assistant',
      timestamp: m.createdAt.toISOString(),
      conversationId: m.conversationId,
    }))
  );
});

// POST /api/chat/messages (non-stream)
router.post('/messages', authenticate, checkMessageLimit, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { content, conversationId, companionId } = req.body as {
    content?: string;
    conversationId?: string;
    companionId?: string;
    stream?: boolean;
  };

  if (!content) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'content is required');
  if (!conversationId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'conversationId is required');
  if (!companionId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'companionId is required');

  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId, companionId } });
  if (!conversation) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Conversation not found');

  await prisma.message.create({
    data: {
      userId,
      conversationId,
      companionId,
      content,
      isFromUser: true,
    },
  });

  const history = await prisma.message.findMany({
    where: { conversationId, userId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const messages: ChatMessage[] = [
  { role: 'system', content: getSystemPrompt() },
  ...history.map((m) => ({
    role: m.isFromUser ? 'user' : 'assistant',
    content: m.content,
  })),
  { role: 'user', content }
];

  const assistantContent = await callGroqAPIOnce({
    model: getDefaultModel(),
    messages,
  });

  const assistantMessage = await prisma.message.create({
    data: {
      userId,
      conversationId,
      companionId,
      content: assistantContent,
      isFromUser: false,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  res.json({
    id: assistantMessage.id,
    content: assistantMessage.content,
    role: 'assistant',
    timestamp: assistantMessage.createdAt.toISOString(),
    conversationId: assistantMessage.conversationId,
  });
});

// POST /api/chat/messages/stream (SSE)
router.post('/messages/stream', authenticate, checkMessageLimit, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Not authenticated');

  const { content, conversationId, companionId } = req.body as {
    content?: string;
    conversationId?: string;
    companionId?: string;
    stream?: boolean;
  };

  if (!content) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'content is required');
  if (!conversationId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'conversationId is required');
  if (!companionId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'companionId is required');

  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId, companionId } });
  if (!conversation) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Conversation not found');

  await prisma.message.create({
    data: {
      userId,
      conversationId,
      companionId,
      content,
      isFromUser: true,
    },
  });

  const history = await prisma.message.findMany({
    where: { conversationId, userId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const messages: ChatMessage[] = [
  { role: 'system', content: getSystemPrompt() },
  ...history.map((m) => ({
    role: m.isFromUser ? 'user' : 'assistant',
    content: m.content,
  })),
  { role: 'user', content }
];

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // @ts-expect-error flushHeaders is available in Node
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  const groqRes = await callGroqAPI({
    model: getDefaultModel(),
    messages,
    stream: true,
    signal: controller.signal,
  });

  const reader = groqRes.body!.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Groq streams Server-Sent Events format
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6); // Remove 'data: ' prefix
      if (data === '[DONE]') {
        res.write('data: [DONE]\n\n');
        break;
      }

      try {
        const chunk = JSON.parse(data) as any;
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          full += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  // Save assistant message once streaming completes
  const assistantMessage = await prisma.message.create({
    data: {
      userId,
      conversationId,
      companionId,
      content: full,
      isFromUser: false,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  res.write(`data: ${JSON.stringify({ id: assistantMessage.id, content: full, done: true })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});

export default router;
