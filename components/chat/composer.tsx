'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ComposerProps {
  disabled?: boolean
  onSend: (text: string, type?: 'text' | 'image', fileData?: string | null) => Promise<void>
  onTyping?: (isTyping: boolean) => void
  placeholder?: string
}

const MAX_IMAGE_BYTES = 800 * 1024 // 800 KB — kept small since it travels encrypted in the DB

export function Composer({ disabled, onSend, onTyping, placeholder }: ComposerProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const submit = async () => {
    const value = text.trim()
    if (!value || sending || disabled) return
    setSending(true)
    try {
      await onSend(value, 'text')
      setText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image too large (max 800 KB)')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      setSending(true)
      try {
        await onSend('', 'image', reader.result as string)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send image')
      } finally {
        setSending(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImage}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={disabled || sending}
          onClick={() => fileRef.current?.click()}
          aria-label="Attach image"
        >
          <ImagePlus className="size-5" />
        </Button>

        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onTyping?.(e.target.value.length > 0)
          }}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || 'Write a message…'}
          className="max-h-32 min-h-[44px] resize-none rounded-2xl bg-card"
        />

        <Button
          size="icon"
          className="size-11 shrink-0 rounded-full"
          disabled={disabled || sending || !text.trim()}
          onClick={submit}
          aria-label="Send message"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </Button>
      </div>
    </div>
  )
}
