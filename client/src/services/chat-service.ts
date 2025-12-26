import apiClient from '../lib/api-client';
import { getAuthToken } from '../lib/auth';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  conversationId: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  companionId: string;
  messages: Message[];
}

export interface SendMessageParams {
  content: string;
  conversationId?: string;
  companionId: string;
  stream?: boolean;
}

export const chatService = {
  // Get all conversations for the current user
  async getConversations(): Promise<Conversation[]> {
    const { data } = await apiClient.get('/chat/conversations');
    return data;
  },

  // Get a single conversation with its messages
  async getConversation(conversationId: string): Promise<Conversation> {
    const { data } = await apiClient.get(`/chat/conversations/${conversationId}`);
    return data;
  },

  // Create a new conversation
  async createConversation(companionId: string, title?: string): Promise<Conversation> {
    const { data } = await apiClient.post('/chat/conversations', { companionId, title });
    return data;
  },

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`);
  },

  // Send a message and get the AI response
  async sendMessage(params: SendMessageParams): Promise<Message> {
    const { data } = await apiClient.post('/chat/messages', params);
    return data;
  },

  // Stream a message (for real-time updates)
  async *streamMessage(params: SendMessageParams) {
    const token = getAuthToken();
    const response = await fetch(`${apiClient.defaults.baseURL}/chat/messages/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...params,
        stream: true,
      }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            yield parsed;
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    }
  },

  // Get chat history for a conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
    return data;
  },

  // Get all companions
  async getCompanions() {
    const { data } = await apiClient.get('/companions');
    return data;
  },

  // Get a single companion
  async getCompanion(companionId: string) {
    const { data } = await apiClient.get(`/companions/${companionId}`);
    return data;
  },
};
