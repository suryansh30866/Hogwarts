'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

interface MessageBubbleProps {
  message: ChatMessage
  /** Whether to render the avatar + name header (first in a group). */
  showHeader: boolean
}

export function MessageBubble({ message, showHeader }: MessageBubbleProps) {
  const { isMe } = message

  return (
    <div className={cn('flex w-full gap-2.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
      <div className="w-8 shrink-0">
        {showHeader && !isMe && (
          <Avatar className="size-8">
            <AvatarImage src={message.photoURL || undefined} alt={message.displayName} />
            <AvatarFallback className="text-xs">
              {message.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        {showHeader && !isMe && (
          <span className="mb-1 px-1 text-xs font-medium text-muted-foreground">
            {message.displayName}
          </span>
        )}

        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isMe
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-card text-card-foreground',
            message.error && 'italic opacity-60',
          )}
        >
          {message.type === 'image' && message.fileData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.fileData || '/placeholder.svg'}
              alt="Shared image"
              className="max-h-72 rounded-lg object-cover"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          )}
        </div>

        <span className="mt-1 px-1 text-[0.65rem] text-muted-foreground/70">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
