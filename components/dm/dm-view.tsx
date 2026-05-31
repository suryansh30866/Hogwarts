'use client'

import { useApp } from '@/components/app-context'
import { useRoom } from '@/hooks/use-room'
import { useCall } from '@/hooks/use-call'
import { MessageList } from '@/components/chat/message-list'
import { Composer } from '@/components/chat/composer'
import { CallOverlay } from '@/components/call/call-overlay'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Menu, ArrowLeft, Phone, Video, PhoneCall } from 'lucide-react'
import { toast } from 'sonner'
import type { DirectoryUser } from '@/lib/types'

interface DmViewProps {
  peer: DirectoryUser
  onBack: () => void
  onOpenMobileNav: () => void
}

/** Stable, symmetric room id so both participants land in the same channel. */
function dmRoomId(a: string, b: string) {
  return `dm_${[a, b].sort().join('_')}`
}

export function DmView({ peer, onBack, onOpenMobileNav }: DmViewProps) {
  const { user, isAdmin, masterKey } = useApp()
  const roomId = user ? dmRoomId(user.uid, peer.uid) : `dm_${peer.uid}`

  const { messages, typingName, send, setTyping } = useRoom(roomId, user, masterKey, isAdmin)
  const call = useCall(roomId, user)

  const startCall = async (type: 'voice' | 'video') => {
    try {
      if (call.active) {
        await call.joinCall(call.active.type)
      } else {
        await call.startCall(type)
      }
    } catch (e) {
      toast.error(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied'
          : 'Could not start the call',
      )
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav}>
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={onBack}
          aria-label="Back to common rooms"
        >
          <ArrowLeft className="size-5" />
        </Button>

        <div className="relative">
          <Avatar className="size-9">
            <AvatarImage src={peer.photoURL || undefined} alt={peer.displayName} />
            <AvatarFallback>{peer.displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background',
              peer.online ? 'bg-emerald-500' : 'bg-muted-foreground/50',
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl text-foreground">{peer.displayName}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {peer.online ? 'Online' : 'Offline'}
            {call.active && ' · call in progress'}
          </p>
        </div>

        <Button
          variant={call.active ? 'default' : 'ghost'}
          size="icon"
          onClick={() => startCall('voice')}
          aria-label="Start voice call"
          title="Voice call"
        >
          {call.active ? <PhoneCall className="size-5" /> : <Phone className="size-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startCall('video')}
          aria-label="Start video call"
          title="Video call"
        >
          <Video className="size-5" />
        </Button>
      </header>

      {/* Active call banner */}
      {call.active && !call.inCall && (
        <button
          onClick={() => startCall(call.active!.type)}
          className="flex items-center justify-center gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <PhoneCall className="size-4" />
          {call.active.startedByName} started a {call.active.type} call · tap to join
        </button>
      )}

      <MessageList
        messages={messages}
        typingName={typingName}
        emptyHint={`This is the beginning of your private conversation with ${peer.displayName}.`}
      />

      <Composer
        onSend={(text, type, fileData) => send(text, type, fileData)}
        onTyping={setTyping}
        placeholder={`Message ${peer.displayName}…`}
      />

      {/* Call overlay */}
      {call.inCall && call.type && (
        <CallOverlay
          title={`${peer.displayName} · Call`}
          type={call.type}
          localStream={call.localStream}
          remoteStreams={call.remoteStreams}
          micOn={call.micOn}
          camOn={call.camOn}
          onToggleMic={call.toggleMic}
          onToggleCam={call.toggleCam}
          onLeave={call.leaveCall}
        />
      )}
    </div>
  )
}
