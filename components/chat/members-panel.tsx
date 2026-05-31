'use client'

import { useApp } from '@/components/app-context'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Ban, UserX, ShieldCheck, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { API } from '@/lib/api'
import { toast } from 'sonner'
import type { RoomMember, DirectoryUser } from '@/lib/types'

interface MembersPanelProps {
  roomId: string
  members: RoomMember[]
  onOpenDm?: (u: DirectoryUser) => void
}

export function MembersPanel({ roomId, members, onOpenDm }: MembersPanelProps) {
  const { user, isAdmin } = useApp()

  const online = members.filter((m) => m.online)
  const offline = members.filter((m) => !m.online)

  const block = async (m: RoomMember) => {
    try {
      await API.blockUser(m.uid, roomId, !m.blocked)
      toast.success(m.blocked ? `${m.displayName} unblocked` : `${m.displayName} blocked`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    }
  }

  const kick = async (m: RoomMember) => {
    try {
      await API.kickUser(m.uid, roomId)
      toast.success(`${m.displayName} removed`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed')
    }
  }

  const renderMember = (m: RoomMember) => (
    <div
      key={m.uid}
      className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
    >
      <div className="relative">
        <Avatar className="size-9">
          <AvatarImage src={m.photoURL || undefined} alt={m.displayName} />
          <AvatarFallback>{m.displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar',
            m.online ? 'bg-emerald-500' : 'bg-muted-foreground/50',
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
          {m.displayName}
          {m.uid === user?.uid && <span className="text-xs text-muted-foreground">(you)</span>}
          {m.isAdmin && <ShieldCheck className="size-3.5 text-primary" />}
        </p>
        {m.blocked && <p className="text-xs text-destructive">Blocked</p>}
      </div>

      {m.uid !== user?.uid && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onOpenDm && (
              <DropdownMenuItem
                onClick={() =>
                  onOpenDm({
                    uid: m.uid,
                    displayName: m.displayName,
                    email: m.email,
                    photoURL: m.photoURL,
                    online: m.online,
                  })
                }
              >
                <MessageCircle className="size-4" />
                Message
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => block(m)}>
                  <Ban className="size-4" />
                  {m.blocked ? 'Unblock' : 'Block'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => kick(m)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserX className="size-4" />
                  Remove from room
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-l border-border bg-sidebar lg:flex">
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-foreground">Members</h3>
        <p className="text-xs text-muted-foreground">{members.length} in this room</p>
      </div>
      <ScrollArea className="scroll-thin flex-1 px-2">
        {online.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Online — {online.length}
            </p>
            {online.map(renderMember)}
          </>
        )}
        {offline.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Offline — {offline.length}
            </p>
            {offline.map(renderMember)}
          </>
        )}
      </ScrollArea>
    </aside>
  )
}
