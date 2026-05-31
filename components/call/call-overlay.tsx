'use client'

import { useApp } from '@/components/app-context'
import { VideoTile } from '@/components/call/video-tile'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RemoteStream } from '@/hooks/use-call'
import type { CallType } from '@/lib/types'

interface CallOverlayProps {
  title: string
  type: CallType
  localStream: MediaStream | null
  remoteStreams: RemoteStream[]
  micOn: boolean
  camOn: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onLeave: () => void
}

export function CallOverlay({
  title,
  type,
  localStream,
  remoteStreams,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onLeave,
}: CallOverlayProps) {
  const { user } = useApp()
  const total = remoteStreams.length + 1
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-xl text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {type === 'video' ? 'Video call' : 'Voice call'} · {total} connected
          </p>
        </div>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto p-5">
        <div
          className={cn('mx-auto grid w-full max-w-5xl gap-3')}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          <VideoTile
            stream={localStream}
            displayName={user?.displayName || 'You'}
            photoURL={user?.photoURL || undefined}
            isLocal
            muted
            hasVideo={type === 'video' && camOn}
            micOff={!micOn}
          />
          {remoteStreams.map((r) => (
            <VideoTile
              key={r.uid}
              stream={r.stream}
              displayName={r.displayName}
              photoURL={r.photoURL}
              hasVideo={r.hasVideo}
            />
          ))}
        </div>

        {remoteStreams.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Waiting for others to join…
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 border-t border-border px-5 py-5">
        <Button
          variant={micOn ? 'secondary' : 'destructive'}
          size="icon"
          className="size-12 rounded-full"
          onClick={onToggleMic}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </Button>

        {type === 'video' && (
          <Button
            variant={camOn ? 'secondary' : 'destructive'}
            size="icon"
            className="size-12 rounded-full"
            onClick={onToggleCam}
            aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="size-12 rounded-full"
          onClick={onLeave}
          aria-label="Leave call"
        >
          <PhoneOff className="size-5" />
        </Button>
      </div>
    </div>
  )
}
