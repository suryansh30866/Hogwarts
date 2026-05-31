'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from '@/components/chat/message-bubble'
import type { ChatMessage } from '@/lib/types'

interface MessageListProps {
  messages: ChatMessage[]
  typingName: string | null
  emptyHint?: string
}

export function MessageList({ messages, typingName, emptyHint }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingName])

  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">{emptyHint || 'No messages yet.'}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Messages are end-to-end encrypted.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const showHeader = !prev || prev.author !== msg.author || msg.timestamp - prev.timestamp > 120000
          return <MessageBubble key={msg.id} message={msg} showHeader={showHeader} />
        })}

        {typingName && (
          <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
            <span className="flex gap-1">
              <span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
              <span className="typing-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:0.15s]" />
              <span className="typing-dot size-1.5 rounded-full bg-muted-foreground [animation-delay:0.3s]" />
            </span>
            {typingName} is typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
