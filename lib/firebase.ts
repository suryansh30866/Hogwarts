/**
 * Firebase client (modular SDK).
 * Used ONLY for: Google auth popup + Realtime Database listeners/writes.
 * The client config below is NOT a secret — it merely identifies the project.
 * Real security comes from Firebase Security Rules + backend token verification.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  onChildAdded,
  onValue,
  update,
  off,
  remove,
  type Database,
} from 'firebase/database'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'

const FIREBASE_CLIENT_CONFIG = {
  apiKey: 'AIzaSyAS_HheqFK98UIvjtiBxtHSOkOfuaOkkug',
  authDomain: 'kwit-5dde3.firebaseapp.com',
  databaseURL: 'https://kwit-5dde3-default-rtdb.firebaseio.com',
  projectId: 'kwit-5dde3',
  storageBucket: 'kwit-5dde3.firebasestorage.app',
  messagingSenderId: '692601571855',
  appId: '1:692601571855:web:03e8538f22f47202a5f17a',
}

let app: FirebaseApp | null = null
let db: Database | null = null
let auth: Auth | null = null

export function getFirebase() {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(FIREBASE_CLIENT_CONFIG)
    db = getDatabase(app)
    auth = getAuth(app)
  }
  return { app: app!, db: db!, auth: auth! }
}

/* ── Auth helpers ───────────────────────────────────────── */

export async function signInWithGooglePopup(): Promise<User> {
  const { auth } = getFirebase()
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function firebaseSignOut(): Promise<void> {
  const { auth } = getFirebase()
  await fbSignOut(auth)
}

export function onAuthStateChanged(cb: (user: User | null) => void) {
  const { auth } = getFirebase()
  return fbOnAuthStateChanged(auth, cb)
}

/* ── Realtime Database helpers ──────────────────────────── */

export async function writeData(path: string, data: unknown): Promise<void> {
  const { db } = getFirebase()
  await set(ref(db, path), data)
}

export async function readData<T = unknown>(path: string): Promise<T | null> {
  const { db } = getFirebase()
  const snapshot = await get(ref(db, path))
  return snapshot.exists() ? (snapshot.val() as T) : null
}

export async function pushData(path: string, data: unknown): Promise<string> {
  const { db } = getFirebase()
  const newRef = push(ref(db, path))
  await set(newRef, data)
  return newRef.key as string
}

export async function updateData(path: string, updates: Record<string, unknown>): Promise<void> {
  const { db } = getFirebase()
  await update(ref(db, path), updates)
}

export async function removeData(path: string): Promise<void> {
  const { db } = getFirebase()
  await remove(ref(db, path))
}

export function listenToNewChildren(
  path: string,
  callback: (snap: { id: string; data: any }) => void,
): () => void {
  const { db } = getFirebase()
  const dbRef = ref(db, path)
  const handler = onChildAdded(dbRef, (s) => callback({ id: s.key as string, data: s.val() }))
  return () => off(dbRef, 'child_added', handler)
}

export function listenToValue(path: string, callback: (val: any) => void): () => void {
  const { db } = getFirebase()
  const dbRef = ref(db, path)
  const handler = onValue(dbRef, (s) => callback(s.val()))
  return () => off(dbRef, 'value', handler)
}

/** Firebase server timestamp sentinel. */
export function serverTimestamp() {
  return { '.sv': 'timestamp' } as const
}
