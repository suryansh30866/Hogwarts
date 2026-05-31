'use client'

import { useState } from 'react'
import { useApp } from '@/components/app-context'
import { useDirectory } from '@/hooks/use-directory'
import { Sidebar } from '@/components/home/sidebar'
import { HousesGrid } from '@/components/home/houses-grid'
import { ChatRoom } from '@/components/chat/chat-room'
import { DmView } from '@/components/dm/dm-view'
import type { DirectoryUser } from '@/lib/types'
import { getHouse } from '@/lib/houses'

type View =
  | { kind: 'houses' }
  | { kind: 'room'; houseId: string }
  | { kind: 'dm'; user: DirectoryUser }

export function HomeScreen() {
  const { user } = useApp()
  const directory = useDirectory(user?.uid)
  const [view, setView] = useState<View>({ kind: 'houses' })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const openHouse = (houseId: string) => {
    setView({ kind: 'room', houseId })
    setMobileNavOpen(false)
  }
  const openDm = (u: DirectoryUser) => {
    setView({ kind: 'dm', user: u })
    setMobileNavOpen(false)
  }
  const goHome = () => {
    setView({ kind: 'houses' })
    setMobileNavOpen(false)
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        directory={directory}
        activeHouseId={view.kind === 'room' ? view.houseId : null}
        activeDmUid={view.kind === 'dm' ? view.user.uid : null}
        onHome={goHome}
        onOpenHouse={openHouse}
        onOpenDm={openDm}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        {view.kind === 'houses' && (
          <HousesGrid onOpenHouse={openHouse} onOpenMobileNav={() => setMobileNavOpen(true)} />
        )}
        {view.kind === 'room' && getHouse(view.houseId) && (
          <ChatRoom
            key={view.houseId}
            house={getHouse(view.houseId)!}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenDm={openDm}
          />
        )}
        {view.kind === 'dm' && (
          <DmView
            key={view.user.uid}
            peer={view.user}
            onBack={goHome}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
        )}
      </main>
    </div>
  )
}
