'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import {
  onAuthStateChanged,
  signInWithGooglePopup,
  firebaseSignOut,
  readData,
  updateData,
  serverTimestamp,
} from '@/lib/firebase'
import { API, loadSession, clearSession } from '@/lib/api'
import { deriveKeyPBKDF2, base64ToArrayBuffer } from '@/lib/crypto'

type Stage = 'loading' | 'signin' | 'password' | 'ready'

interface AppContextValue {
  stage: Stage
  user: User | null
  isAdmin: boolean
  masterKey: CryptoKey | null
  signIn: () => Promise<void>
  submitPassword: (password: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within <AppProvider>')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Watch Firebase auth state. On reload we try to re-validate the backend session.
  useEffect(() => {
    loadSession()
    const unsub = onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setIsAdmin(false)
        setMasterKey(null)
        setStage('signin')
        return
      }
      setUser(fbUser)
      // Try to restore the backend session (gives us isAdmin again).
      try {
        const me = await API.getMe()
        setIsAdmin(!!me.isAdmin)
      } catch {
        // Session expired/missing — user must sign in again to re-exchange token.
        clearSession()
      }
      // The master key only lives in memory, so after a reload we always
      // need the password again to re-derive it.
      setStage((prev) => (prev === 'ready' ? 'ready' : 'password'))
    })
    return () => unsub()
  }, [])

  // Online heartbeat once we are fully in.
  useEffect(() => {
    if (stage !== 'ready' || !user) return
    const mark = (online: boolean) => {
      updateData(`users/${user.uid}`, {
        online,
        lastSeen: serverTimestamp(),
      }).catch(() => {})
    }
    mark(true)
    heartbeatRef.current = setInterval(() => mark(true), 30000)
    const onUnload = () => mark(false)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      window.removeEventListener('beforeunload', onUnload)
      mark(false)
    }
  }, [stage, user])

  const signIn = useCallback(async () => {
    const fbUser = await signInWithGooglePopup()
    const idToken = await fbUser.getIdToken()
    const session = await API.verifyIdToken(idToken)
    setUser(fbUser)
    setIsAdmin(!!session.isAdmin)
    setStage('password')
  }, [])

  const deriveMasterKey = useCallback(async (password: string) => {
    const saltB64 = await readData<string>('global/salt')
    if (!saltB64) throw new Error('Password not initialised yet')
    const salt = base64ToArrayBuffer(saltB64)
    return deriveKeyPBKDF2(password, salt)
  }, [])

  const storeProfile = useCallback(
    async (u: User, admin: boolean) => {
      await updateData(`users/${u.uid}`, {
        displayName: u.displayName || 'Anonymous',
        email: u.email,
        photoURL: u.photoURL || '',
        lastSeen: serverTimestamp(),
        isAdmin: admin,
        online: true,
      })
    },
    [],
  )

  const submitPassword = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: 'Not signed in' }
      try {
        const res = await API.verifyPassword(password)

        if (res.needsInit) {
          if (!isAdmin) {
            return { ok: false, error: 'Password not set up yet. Ask an admin to initialise it.' }
          }
          await API.initPassword(password)
        } else if (!res.valid) {
          return { ok: false, error: 'Incorrect password' }
        }

        const key = await deriveMasterKey(password)
        setMasterKey(key)
        await storeProfile(user, isAdmin)
        setStage('ready')
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Verification failed' }
      }
    },
    [user, isAdmin, deriveMasterKey, storeProfile],
  )

  const signOut = useCallback(async () => {
    if (user) {
      await updateData(`users/${user.uid}`, {
        online: false,
        currentRoom: null,
        currentRoomName: null,
        lastSeen: serverTimestamp(),
      }).catch(() => {})
    }
    clearSession()
    setMasterKey(null)
    setIsAdmin(false)
    setUser(null)
    setStage('signin')
    await firebaseSignOut()
  }, [user])

  return (
    <AppContext.Provider
      value={{ stage, user, isAdmin, masterKey, signIn, submitPassword, signOut }}
    >
      {children}
    </AppContext.Provider>
  )
}
