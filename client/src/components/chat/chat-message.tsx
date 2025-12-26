import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/icons"

interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message: {
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
    avatarUrl?: string
    isTyping?: boolean
  }
  isStreaming?: boolean
}

export function ChatMessage({
  message,
  isStreaming = false,
  className,
  ...props
}: ChatMessageProps) {
  const { content, role, avatarUrl, isTyping } = message
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        "group flex items-start gap-4 py-4 px-4 hover:bg-muted/50 transition-colors",
        isUser ? "bg-muted/30" : "",
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={isUser ? 'You' : 'AI'} />
          ) : (
            <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : ""}>
              {isUser ? (
                <Icons.user className="h-4 w-4" />
              ) : (
                <Icons.bot className="h-4 w-4" />
              )}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <p className="font-medium">
            {isUser ? 'You' : 'AI Companion'}
          </p>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isTyping ? (
            <div className="flex space-x-1">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <div className="whitespace-pre-wrap">
              {content}
              {isStreaming && !isUser && (
                <span className="inline-block h-3 w-1.5 bg-primary ml-1 -mb-0.5 animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
