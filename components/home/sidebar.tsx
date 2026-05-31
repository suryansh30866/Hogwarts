'use client'

import { useApp } from '@/components/app-context'
import { HOUSES } from '@/lib/houses'
import type { DirectoryUser } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Home, LogOut, Shield, X, MessageCircle } from 'lucide-react'
import { HouseCrest } from '@/components/home/house-crest'
import { useState } from 'react'
import { AdminPanel } from '@/components/admin/admin-panel'

interface SidebarProps {
  directory: DirectoryUser[]
  activeHouseId: string | null
  activeDmUid: string | null
  onHome: () => void
  onOpenHouse: (id: string) => void
  onOpenDm: (u: DirectoryUser) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({
  directory,
  activeHouseId,
  activeDmUid,
  onHome,
  onOpenHouse,
  onOpenDm,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const { user, isAdmin, signOut } = useApp()
  const [adminOpen, setAdminOpen] = useState(false)

  const onlineCount = directory.filter((u) => u.online).length

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <button onClick={onHome} className="flex flex-col items-start">
            <span className="font-display text-2xl tracking-[0.25em] text-foreground">HOGWARTS</span>
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
              Astrakshaya
            </span>
          </button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="px-3">
          <button
            onClick={onHome}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              !activeHouseId && !activeDmUid
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <Home className="size-4" />
            Common Rooms
          </button>
        </div>

        <ScrollArea className="scroll-thin mt-2 flex-1 px-3">
          {/* Houses */}
          <p className="px-3 pb-1.5 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Houses
          </p>
          <div className="flex flex-col gap-0.5">
            {HOUSES.map((house) => (
              <button
                key={house.id}
                onClick={() => onOpenHouse(house.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  activeHouseId === house.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <HouseCrest house={house} size={28} />
                <span className="font-medium">{house.name}</span>
              </button>
            ))}
          </div>

          {/* Direct messages */}
          <div className="flex items-center justify-between px-3 pb-1.5 pt-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Direct Messages
            </p>
            <span className="text-[0.65rem] text-muted-foreground">{onlineCount} online</span>
          </div>
          <div className="flex flex-col gap-0.5 pb-4">
            {directory.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">No other members yet.</p>
            )}
            {directory.map((u) => (
              <button
                key={u.uid}
                onClick={() => onOpenDm(u)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  activeDmUid === u.uid
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <div className="relative">
                  <Avatar className="size-8">
                    <AvatarImage src={u.photoURL || undefined} alt={u.displayName} />
                    <AvatarFallback className="text-xs">
                      {u.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar',
                      u.online ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                    )}
                  />
                </div>
                <span className="min-w-0 flex-1 truncate text-left font-medium">
                  {u.displayName}
                </span>
                <MessageCircle className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Profile / footer */}
        <div className="border-t border-border p-3">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="mb-2 w-full justify-start gap-2 bg-transparent"
              onClick={() => setAdminOpen(true)}
            >
              <Shield className="size-4 text-primary" />
              Admin panel
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
                <Avatar className="size-9">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                  <AvatarFallback>
                    {(user?.displayName || 'A').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user?.displayName || 'Anonymous'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isAdmin ? 'Administrator' : 'Member'}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {isAdmin && <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} directory={directory} />}
    </>
  )
}
