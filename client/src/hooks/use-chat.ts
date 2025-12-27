import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { chatService, type Message, type Conversation, type SendMessageParams } from '@/services/chat-service';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

// Query keys
export const chatKeys = {
  all: ['chats'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...chatKeys.conversations(), id] as const,
  messages: (conversationId: string) => [...chatKeys.conversation(conversationId), 'messages'] as const,
  companions: () => [...chatKeys.all, 'companions'] as const,
  companion: (id: string) => [...chatKeys.companions(), id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: () => chatService.getConversations(),
    enabled: true, // Only fetch when authenticated
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () => chatService.getConversation(conversationId),
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: async ({ pageParam = 0 }) => {
      // This is a simplified example - you might want to adjust pagination logic
      const messages = await chatService.getMessages(conversationId);
      // Split messages into pages of 20
      const perPage = 20;
      const start = pageParam * perPage;
      return {
        data: messages.slice(start, start + perPage),
        nextPage: start + perPage < messages.length ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!conversationId,
    initialPageParam: 0,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ companionId, title }: { companionId: string; title?: string }) =>
      chatService.createConversation(companionId, title),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      navigate(`/chat/${data.id}`);
      toast.success('New conversation started');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start conversation');
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (conversationId: string) => chatService.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.removeQueries({ queryKey: chatKeys.conversation(conversationId) });
      navigate('/chat');
      toast.success('Conversation deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete conversation');
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { conversationId } = useParams<{ conversationId: string }>();

  return useMutation({
    mutationFn: async (params: Omit<SendMessageParams, 'conversationId' | 'companionId'>) => {
      if (!conversationId) throw new Error('No conversation selected');
      
      // Get conversation to extract companionId
      const conversation = await chatService.getConversation(conversationId);
      
      return chatService.sendMessage({ 
        ...params, 
        conversationId,
        companionId: conversation.companionId
      });
    },
    onMutate: async (newMessage) => {
      // Optimistic update
      const previousMessages = queryClient.getQueryData<Message[]>(
        chatKeys.messages(conversationId!)
      );

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content: newMessage.content,
        role: 'user',
        timestamp: new Date().toISOString(),
        conversationId: conversationId!,
      };

      queryClient.setQueryData<Message[]>(
        chatKeys.messages(conversationId!),
        (old = []) => [...old, optimisticMessage]
      );

      return { previousMessages };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          chatKeys.messages(conversationId!),
          context.previousMessages
        );
      }
      toast.error(error.message || 'Failed to send message');
    },
    onSettled: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId!) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useStreamMessage() {
  const queryClient = useQueryClient();
  const { conversationId } = useParams<{ conversationId: string }>();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error('No conversation selected');
      
      // Get conversation to extract companionId
      const conversation = await chatService.getConversation(conversationId);
      
      const generator = chatService.streamMessage({
        content,
        conversationId,
        companionId: conversation.companionId,
        stream: true,
      });

      // Process the stream
      let fullResponse = '';
      for await (const chunk of generator) {
        fullResponse += chunk.content || '';
        // Update the UI with each chunk
        queryClient.setQueryData<Message[]>(
          chatKeys.messages(conversationId),
          (old = []) => {
            const messages = [...old];
            const lastMessage = messages[messages.length - 1];
            
            if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
              // Update existing streaming message
              return [
                ...messages.slice(0, -1),
                { ...lastMessage, content: fullResponse },
              ];
            } else {
              // Create new streaming message
              return [
                ...messages,
                {
                  id: `stream-${Date.now()}`,
                  content: fullResponse,
                  role: 'assistant',
                  timestamp: new Date().toISOString(),
                  conversationId,
                  isStreaming: true,
                },
              ];
            }
          }
        );
      }

      // Finalize the streaming message
      queryClient.setQueryData<Message[]>(
        chatKeys.messages(conversationId),
        (old = []) => {
          const messages = [...old];
          const lastMessage = messages[messages.length - 1];
          
          if (lastMessage?.isStreaming) {
            return [
              ...messages.slice(0, -1),
              { ...lastMessage, isStreaming: false },
            ];
          }
          return messages;
        }
      );

      return { content: fullResponse };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useCompanions() {
  return useQuery({
    queryKey: chatKeys.companions(),
    queryFn: () => chatService.getCompanions(),
  });
}

export function useCompanion(companionId: string) {
  return useQuery({
    queryKey: chatKeys.companion(companionId),
    queryFn: () => chatService.getCompanion(companionId),
    enabled: !!companionId,
  });
}

// Hook to handle real-time updates for messages
export function useSubscribeToMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // In a real app, you would connect to your WebSocket server
    // wsRef.current = new WebSocket(`wss://your-api.com/ws?conversationId=${conversationId}`);
    
    // This is a placeholder for the WebSocket implementation
    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      queryClient.setQueryData<Message[]>(
        chatKeys.messages(conversationId),
        (old = []) => [...old, message]
      );
    };

    // wsRef.current.addEventListener('message', handleMessage);

    return () => {
      // if (wsRef.current) {
      //   wsRef.current.removeEventListener('message', handleMessage);
      //   wsRef.current.close();
      //   wsRef.current = null;
      // }
    };
  }, [conversationId, queryClient]);

  return wsRef;
}
