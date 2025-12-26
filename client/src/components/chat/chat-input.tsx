import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';

const messageFormSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message is too long'),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) {
  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      message: '',
    },
  });

  const handleSubmit = (data: MessageFormValues) => {
    onSubmit(data.message);
    form.reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn('flex w-full items-center gap-2', className)}
    >
      <div className="relative flex-1">
        <Textarea
          {...form.register('message')}
          placeholder={placeholder}
          className="min-h-[44px] max-h-32 resize-none pr-12"
          onKeyDown={handleKeyDown}
          disabled={isLoading || disabled}
          rows={1}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLoading || disabled}
          >
            <Icons.paperclip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        size="icon"
        className="h-10 w-10"
        disabled={isLoading || disabled || !form.watch('message').trim()}
      >
        {isLoading ? (
          <Icons.loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icons.send className="h-4 w-4" />
        )}
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
