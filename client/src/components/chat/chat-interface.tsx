import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Icons } from '@/components/icons';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Message } from '@/services/chat-service';

interface ChatInterfaceProps {
  className?: string;
  companion?: {
    id: string;
    name: string;
    avatarUrl?: string;
    description?: string;
  };
  initialMessages?: Message[];
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
}

export function ChatInterface({
  className,
  companion,
  initialMessages = [],
  onSendMessage,
  isLoading = false,
  isStreaming = false,
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Update messages when initialMessages change
  React.useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
      conversationId: '', // This will be filled by the actual implementation
    };

    const botMessage: Message = {
      id: `bot-${Date.now()}`,
      content: '',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      conversationId: '', // This will be filled by the actual implementation
      isStreaming: true,
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, userMessage, botMessage]);

    try {
      if (onSendMessage) {
        await onSendMessage(content);
      }
      
      // Update the last message to remove streaming indicator
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the streaming indicator on error
      setMessages((prev) => prev.filter((msg) => !msg.isStreaming));
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => window.history.back()}
          >
            <Icons.arrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="relative h-10 w-10 rounded-full bg-muted">
              {companion?.avatarUrl ? (
                <img
                  src={companion.avatarUrl}
                  alt={companion.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <Icons.bot className="h-5 w-5 text-muted-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">
                {companion?.name || 'AI Companion'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isStreaming ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Icons.phone className="h-5 w-5" />
            <span className="sr-only">Voice Call</span>
          </Button>
          <Button variant="ghost" size="icon">
            <Icons.video className="h-5 w-5" />
            <span className="sr-only">Video Call</span>
          </Button>
          <Button variant="ghost" size="icon">
            <Icons.moreVertical className="h-5 w-5" />
            <span className="sr-only">More</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Icons.message className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {companion?.description || 'Send a message to start chatting with your AI companion.'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  ...message,
                  avatarUrl:
                    message.role === 'user' ? user?.avatarUrl : companion?.avatarUrl,
                }}
                isStreaming={isStreaming && message.role === 'assistant' && message === messages[messages.length - 1]}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          disabled={isStreaming}
          placeholder={isStreaming ? 'AI is typing...' : 'Type a message...'}
        />
      </div>
    </div>
  );
}
