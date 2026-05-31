'use client'

import { useEffect, useState } from 'react'
import { listenToValue } from '@/lib/firebase'
import type { DirectoryUser } from '@/lib/types'

/**
 * Live directory of every known user (from /users in Firebase).
 * Used for the DM list and online presence. Excludes the current user.
 */
export function useDirectory(currentUid: string | undefined) {
  const [users, setUsers] = useState<DirectoryUser[]>([])

  useEffect(() => {
    const unsub = listenToValue('users', (data: Record<string, any> | null) => {
      if (!data) {
        setUsers([])
        return
      }
      const list: DirectoryUser[] = Object.entries(data)
        .filter(([uid]) => uid !== currentUid)
        .map(([uid, u]) => ({
          uid,
          displayName: u.displayName || 'Anonymous',
          email: u.email || '',
          photoURL: u.photoURL || '',
          online: !!u.online,
          currentRoomName: u.currentRoomName || null,
        }))
        .sort((a, b) => {
          if (a.online !== b.online) return a.online ? -1 : 1
          return a.displayName.localeCompare(b.displayName)
        })
      setUsers(list)
    })
    return () => unsub()
  }, [currentUid])

  return users
}
