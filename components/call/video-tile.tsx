'use client'

import { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoTileProps {
  stream: MediaStream | null
  displayName: string
  photoURL?: string
  muted?: boolean
  isLocal?: boolean
  hasVideo: boolean
  micOff?: boolean
}

export function VideoTile({
  stream,
  displayName,
  photoURL,
  muted,
  isLocal,
  hasVideo,
  micOff,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className={cn('h-full w-full object-cover', isLocal && 'scale-x-[-1]')}
        />
      ) : (
        <Avatar className="size-20">
          <AvatarImage src={photoURL || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <span className="truncate text-xs font-medium text-white">
          {displayName}
          {isLocal && ' (you)'}
        </span>
        {micOff && <MicOff className="size-3.5 shrink-0 text-red-400" />}
      </div>
    </div>
  )
}
