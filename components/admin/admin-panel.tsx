'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { API } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Megaphone, Users, Loader2, ShieldCheck } from 'lucide-react'
import type { DirectoryUser } from '@/lib/types'

interface AdminUser {
  uid: string
  displayName: string
  email: string
  photoURL: string
  isAdmin: boolean
  online: boolean
}

interface AdminPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Live directory used as an immediate fallback list while the backend loads. */
  directory: DirectoryUser[]
}

export function AdminPanel({ open, onOpenChange, directory }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    API.getUsers()
      .then((res) => {
        const list: AdminUser[] = Object.entries(res.users || {}).map(
          ([uid, u]: [string, any]) => ({
            uid,
            displayName: u.displayName || u.email || 'Anonymous',
            email: u.email || '',
            photoURL: u.photoURL || '',
            isAdmin: !!u.isAdmin,
            online: !!u.online,
          }),
        )
        list.sort((a, b) => {
          if (a.online !== b.online) return a.online ? -1 : 1
          return a.displayName.localeCompare(b.displayName)
        })
        setUsers(list)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoadingUsers(false))
  }, [open])

  const sendBroadcast = async () => {
    const msg = broadcastMsg.trim()
    if (!msg) return
    setBusy('broadcast')
    try {
      await API.broadcast(msg)
      setBroadcastMsg('')
      toast.success('Broadcast sent to all rooms')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Broadcast failed')
    } finally {
      setBusy(null)
    }
  }

  // Fall back to the live directory until the backend list resolves.
  const shownUsers: AdminUser[] =
    users.length > 0
      ? users
      : directory.map((u) => ({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          isAdmin: false,
          online: u.online,
        }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Admin tools</DialogTitle>
          <DialogDescription>Manage the castle and its residents.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Broadcast */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Megaphone className="size-4 text-primary" />
              Broadcast to every common room
            </div>
            <Textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder="Announcement message…"
              className="min-h-20 resize-none bg-secondary"
            />
            <Button
              size="sm"
              disabled={!broadcastMsg.trim() || busy === 'broadcast'}
              onClick={sendBroadcast}
            >
              {busy === 'broadcast' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Megaphone className="size-4" />
              )}
              Send broadcast
            </Button>
          </section>

          {/* Members */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="size-4 text-primary" />
              All members ({shownUsers.length})
            </div>
            <ScrollArea className="scroll-thin h-64 rounded-lg border border-border">
              {loadingUsers && users.length === 0 ? (
                <div className="flex h-full items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : shownUsers.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No members found.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {shownUsers.map((u) => (
                    <li key={u.uid} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="relative">
                        <Avatar className="size-8">
                          <AvatarImage src={u.photoURL || undefined} alt={u.displayName} />
                          <AvatarFallback className="text-xs">
                            {u.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card',
                            u.online ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                          {u.displayName}
                          {u.isAdmin && <ShieldCheck className="size-3.5 text-primary" />}
                        </p>
                        {u.email && (
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        )}
                      </div>
                      {u.isAdmin && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                          admin
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
