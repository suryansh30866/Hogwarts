'use client'

import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { useRoom } from '@/hooks/use-room'
import { useCall } from '@/hooks/use-call'
import { MessageList } from '@/components/chat/message-list'
import { Composer } from '@/components/chat/composer'
import { MembersPanel } from '@/components/chat/members-panel'
import { CallOverlay } from '@/components/call/call-overlay'
import { HouseCrest } from '@/components/home/house-crest'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Phone, Video, Users, Trash2, PhoneCall } from 'lucide-react'
import { API } from '@/lib/api'
import { toast } from 'sonner'
import type { House } from '@/lib/houses'
import type { DirectoryUser } from '@/lib/types'

interface ChatRoomProps {
  house: House
  onOpenMobileNav: () => void
  onOpenDm: (u: DirectoryUser) => void
}

export function ChatRoom({ house, onOpenMobileNav, onOpenDm }: ChatRoomProps) {
  const { user, isAdmin, masterKey } = useApp()
  const { messages, members, typingName, send, setTyping } = useRoom(
    house.id,
    user,
    masterKey,
    isAdmin,
  )
  const call = useCall(`room_${house.id}`, user)
  const [showMembersMobile, setShowMembersMobile] = useState(false)

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

  const clearChat = async () => {
    if (!confirm('Delete all messages in this room? This cannot be undone.')) return
    try {
      await API.clearChat(house.id)
      toast.success('Chat cleared')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to clear chat')
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav}>
            <Menu className="size-5" />
          </Button>
          <HouseCrest house={house} size={38} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl text-foreground">{house.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {members.filter((m) => m.online).length} online
              {call.active && ' · call in progress'}
            </p>
          </div>

          {/* Call buttons */}
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

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setShowMembersMobile((v) => !v)}
            aria-label="Show members"
          >
            <Users className="size-5" />
          </Button>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Room options">
                  <Trash2 className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={clearChat}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Clear all messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Active call banner (when a call exists but you haven't joined) */}
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
          emptyHint={`Welcome to the ${house.name} common room.`}
        />

        <Composer
          onSend={(text, type, fileData) => send(text, type, fileData)}
          onTyping={setTyping}
          placeholder={`Message ${house.name}…`}
        />
      </div>

      {/* Members: desktop persistent, mobile toggled */}
      <MembersPanel roomId={house.id} members={members} onOpenDm={onOpenDm} />
      {showMembersMobile && (
        <>
          <button
            aria-label="Close members"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setShowMembersMobile(false)}
          />
          <div className="fixed inset-y-0 right-0 z-40 flex w-64 lg:hidden">
            <MembersPanel roomId={house.id} members={members} onOpenDm={onOpenDm} />
          </div>
        </>
      )}

      {/* Call overlay */}
      {call.inCall && call.type && (
        <CallOverlay
          title={`${house.name} · Call`}
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
