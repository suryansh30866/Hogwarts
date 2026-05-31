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
import {
  deriveKeyPBKDF2,
  aesGcmEncrypt,
  aesGcmDecrypt,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  randomSalt,
} from '@/lib/crypto'

type Stage = 'loading' | 'signin' | 'password' | 'ready'

/** Constant encrypted with the derived key so we can verify a passphrase
 *  client-side without ever storing it (zero-knowledge). */
const VERIFY_TOKEN = 'HOGWARTS_CHAMBER_OK'

interface VerifierPayload {
  ciphertext: string
  iv: string
}

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

/** Reads admin status straight from the database. */
async function readIsAdmin(uid: string): Promise<boolean> {
  const v = await readData<boolean>(`global/admins/${uid}`)
  return v === true
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Watch Firebase auth state.
  useEffect(() => {
    const unsub = onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setIsAdmin(false)
        setMasterKey(null)
        setStage('signin')
        return
      }
      setUser(fbUser)
      try {
        setIsAdmin(await readIsAdmin(fbUser.uid))
      } catch {
        setIsAdmin(false)
      }
      // The master key only lives in memory, so after a reload we always
      // need the passphrase again to re-derive it.
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
    setUser(fbUser)
    try {
      setIsAdmin(await readIsAdmin(fbUser.uid))
    } catch {
      setIsAdmin(false)
    }
    setStage('password')
  }, [])

  const storeProfile = useCallback(async (u: User, admin: boolean) => {
    await updateData(`users/${u.uid}`, {
      displayName: u.displayName || 'Anonymous',
      email: u.email,
      photoURL: u.photoURL || '',
      lastSeen: serverTimestamp(),
      isAdmin: admin,
      online: true,
    })
  }, [])

  const submitPassword = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: 'Not signed in' }
      if (!password) return { ok: false, error: 'Enter the passphrase' }

      try {
        const saltB64 = await readData<string>('global/salt')

        // ── First run: the chamber has no passphrase yet ──
        if (!saltB64) {
          const admins = await readData<Record<string, boolean>>('global/admins')
          const hasAdmins = !!admins && Object.keys(admins).length > 0
          if (hasAdmins && !isAdmin) {
            return {
              ok: false,
              error: 'The chamber is sealed. Ask an admin to set the passphrase.',
            }
          }

          // Initialise: derive the key, store salt + a verification token, and
          // make this first user an admin.
          const salt = randomSalt(16)
          const key = await deriveKeyPBKDF2(password, salt)
          const verifier = await aesGcmEncrypt(key, VERIFY_TOKEN)
          await updateData('global', {
            salt: arrayBufferToBase64(salt),
            verifier,
          })
          await updateData('global/admins', { [user.uid]: true })

          setIsAdmin(true)
          setMasterKey(key)
          await storeProfile(user, true)
          setStage('ready')
          return { ok: true }
        }

        // ── Normal unlock: verify against the stored token ──
        const salt = base64ToArrayBuffer(saltB64)
        const key = await deriveKeyPBKDF2(password, salt)
        const verifier = await readData<VerifierPayload>('global/verifier')

        if (verifier?.ciphertext && verifier?.iv) {
          try {
            const decoded = await aesGcmDecrypt<string>(key, verifier.ciphertext, verifier.iv)
            if (decoded !== VERIFY_TOKEN) {
              return { ok: false, error: 'Incorrect passphrase' }
            }
          } catch {
            return { ok: false, error: 'Incorrect passphrase' }
          }
        }

        setMasterKey(key)
        await storeProfile(user, isAdmin)
        setStage('ready')
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Verification failed' }
      }
    },
    [user, isAdmin, storeProfile],
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
