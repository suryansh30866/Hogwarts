"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { API } from "@/lib/api"
import { toast } from "sonner"
import { Megaphone, Trash2, Users, Loader2 } from "lucide-react"

interface AdminPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  roomName: string
}

interface DirUser {
  uid: string
  displayName?: string
  email?: string
  isAdmin?: boolean
}

export function AdminPanel({ open, onOpenChange, roomId, roomName }: AdminPanelProps) {
  const [users, setUsers] = useState<DirUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    API.getUsers()
      .then((res) => {
        const list = Object.entries(res.users || {}).map(([uid, u]: [string, any]) => ({
          uid,
          displayName: u.displayName,
          email: u.email,
          isAdmin: u.isAdmin,
        }))
        setUsers(list)
      })
      .catch((e) => toast.error(e.message || "Failed to load users"))
      .finally(() => setLoadingUsers(false))
  }, [open])

  async function run(key: string, fn: () => Promise<unknown>, successMsg: string) {
    setBusy(key)
    try {
      await fn()
      toast.success(successMsg)
    } catch (e: any) {
      toast.error(e.message || "Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Admin tools</DialogTitle>
          <DialogDescription>
            Managing <span className="text-foreground">{roomName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Broadcast */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Megaphone className="size-4 text-muted-foreground" />
              Broadcast to all members
            </div>
            <Textarea
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder="Announcement message..."
              className="min-h-20 resize-none bg-secondary"
            />
            <Button
              size="sm"
              disabled={!broadcastMsg.trim() || busy === "broadcast"}
              onClick={() =>
                run("broadcast", async () => {
                  await API.broadcast(broadcastMsg.trim())
                  setBroadcastMsg("")
                }, "Broadcast sent")
              }
            >
              {busy === "broadcast" ? <Loader2 className="size-4 animate-spin" /> : "Send broadcast"}
            </Button>
          </section>

          {/* Room actions */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trash2 className="size-4 text-muted-foreground" />
              Room actions
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy === "clear"}
                onClick={() =>
                  run("clear", () => API.clearChat(roomId), "Chat cleared")
                }
              >
                {busy === "clear" ? <Loader2 className="size-4 animate-spin" /> : "Clear chat history"}
              </Button>
            </div>
          </section>

          {/* Members */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 text-muted-foreground" />
              Members ({users.length})
            </div>
            <ScrollArea className="h-56 rounded-md border border-border">
              {loadingUsers ? (
                <div className="flex h-full items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {users.map((u) => (
                    <li key={u.uid} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {u.displayName || u.email || u.uid}
                          {u.isAdmin && (
                            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                              admin
                            </span>
                          )}
                        </p>
                        {u.email && <p className="truncate text-xs text-muted-foreground">{u.email}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={busy === `block-${u.uid}` || u.isAdmin}
                          onClick={() =>
                            run(`block-${u.uid}`, () => API.blockUser(u.uid, roomId, true), "User blocked")
                          }
                        >
                          Block
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={busy === `kick-${u.uid}` || u.isAdmin}
                          onClick={() =>
                            run(`kick-${u.uid}`, () => API.kickUser(u.uid, roomId), "User kicked")
                          }
                        >
                          Kick
                        </Button>
                      </div>
                    </li>
                  ))}
                  {users.length === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">No users found.</li>
                  )}
                </ul>
              )}
            </ScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
