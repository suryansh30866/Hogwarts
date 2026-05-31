'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  listenToNewChildren,
  listenToValue,
  pushData,
  updateData,
  serverTimestamp,
} from '@/lib/firebase'
import { aesGcmEncrypt, aesGcmDecrypt } from '@/lib/crypto'
import type { ChatMessage, RoomMember } from '@/lib/types'
import type { User } from 'firebase/auth'

/**
 * Joins a default (house) room, streams + decrypts messages, tracks typing
 * and members. All crypto is client-side using the global master key.
 */
export function useRoom(
  roomId: string,
  user: User | null,
  masterKey: CryptoKey | null,
  isAdmin: boolean,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<RoomMember[]>([])
  const [typingName, setTypingName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const seen = useRef<Set<string>>(new Set())
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Register membership + presence in this room.
  useEffect(() => {
    if (!user || !masterKey) return
    let cancelled = false

    const register = async () => {
      await updateData(`rooms/${roomId}/members/${user.uid}`, {
        displayName: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL || '',
        online: true,
        currentRoom: roomId,
        joinedAt: serverTimestamp(),
        isAdmin,
        blocked: false,
      })
      await updateData(`users/${user.uid}`, {
        currentRoom: roomId,
        currentRoomName: roomId,
        online: true,
      })
      if (!cancelled) setReady(true)
    }
    register().catch(() => setReady(true))

    return () => {
      cancelled = true
      updateData(`rooms/${roomId}/members/${user.uid}`, {
        online: false,
        currentRoom: null,
      }).catch(() => {})
      updateData(`users/${user.uid}`, { currentRoom: null, currentRoomName: null }).catch(() => {})
    }
  }, [roomId, user, masterKey, isAdmin])

  // Stream + decrypt messages.
  useEffect(() => {
    if (!user || !masterKey) return
    seen.current = new Set()
    setMessages([])

    const unsub = listenToNewChildren(`messages/${roomId}`, async (snap) => {
      if (seen.current.has(snap.id)) return
      seen.current.add(snap.id)
      try {
        const dec = await aesGcmDecrypt<any>(masterKey, snap.data.ciphertext, snap.data.iv, true)
        const msg: ChatMessage = {
          id: snap.id,
          text: dec.text,
          type: dec.type || 'text',
          fileData: dec.fileData || null,
          author: dec.author,
          displayName: dec.displayName || 'Unknown',
          photoURL: dec.photoURL || '',
          timestamp: dec.timestamp,
          isMe: dec.author === user.uid,
        }
        setMessages((prev) => [...prev, msg])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: snap.id,
            text: '[Unable to decrypt]',
            type: 'text',
            fileData: null,
            author: 'system',
            displayName: 'System',
            photoURL: '',
            timestamp: Date.now(),
            isMe: false,
            error: true,
          },
        ])
      }
    })
    return () => unsub()
  }, [roomId, user, masterKey])

  // Members list.
  useEffect(() => {
    const unsub = listenToValue(`rooms/${roomId}/members`, (data: Record<string, any> | null) => {
      if (!data) {
        setMembers([])
        return
      }
      const list: RoomMember[] = Object.entries(data).map(([uid, m]) => ({
        uid,
        displayName: m.displayName || 'Anonymous',
        email: m.email || '',
        photoURL: m.photoURL || '',
        online: !!m.online,
        isAdmin: !!m.isAdmin,
        blocked: !!m.blocked,
      }))
      list.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1
        return a.displayName.localeCompare(b.displayName)
      })
      setMembers(list)
    })
    return () => unsub()
  }, [roomId])

  // Typing indicator listener.
  useEffect(() => {
    if (!user) return
    const unsub = listenToValue(`rooms/${roomId}/typing`, (data: Record<string, any> | null) => {
      if (!data) {
        setTypingName(null)
        return
      }
      for (const [uid, d] of Object.entries(data)) {
        if (uid !== user.uid && d.isTyping === true) {
          setTypingName(d.displayName || 'Someone')
          return
        }
      }
      setTypingName(null)
    })
    return () => unsub()
  }, [roomId, user])

  const send = useCallback(
    async (text: string, type: 'text' | 'image' | 'file' = 'text', fileData: string | null = null) => {
      if (!user || !masterKey) return
      if (type === 'text' && !text.trim()) return
      const messageObj = {
        text: type === 'text' ? text.trim() : text || '',
        type,
        fileData: fileData || null,
        author: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        timestamp: Date.now(),
      }
      const enc = await aesGcmEncrypt(masterKey, messageObj)
      await pushData(`messages/${roomId}`, {
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        serverTimestamp: serverTimestamp(),
      })
      setTyping(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, user, masterKey],
  )

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!user) return
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      updateData(`rooms/${roomId}/typing/${user.uid}`, {
        isTyping,
        displayName: user.displayName || 'Anonymous',
        timestamp: serverTimestamp(),
      }).catch(() => {})
      if (isTyping) {
        typingTimeout.current = setTimeout(() => setTyping(false), 3000)
      }
    },
    [roomId, user],
  )

  return { messages, setMessages, members, typingName, ready, send, setTyping }
}
