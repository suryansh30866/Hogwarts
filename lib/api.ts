/**
 * Thin client for the Modal / FastAPI backend.
 * Handles the session token, JSON parsing and error normalisation.
 * Mirrors the original AION API surface exactly so your backend needs no changes.
 */

// ── CONFIG — your deployed backend ───────────────────────
const BACKEND_URL = 'https://modalacc77--aion-backend-fastapi-app.modal.run'
// ─────────────────────────────────────────────────────────

const SESSION_KEY = 'aion_session'

let _sessionToken: string | null = null

function setSession(token: string) {
  _sessionToken = token
  try {
    sessionStorage.setItem(SESSION_KEY, token)
  } catch {}
}

export function loadSession(): string | null {
  try {
    _sessionToken = sessionStorage.getItem(SESSION_KEY) || null
  } catch {}
  return _sessionToken
}

export function clearSession() {
  _sessionToken = null
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {}
}

export function hasSession(): boolean {
  return !!_sessionToken
}

async function call<T = any>(method: string, path: string, body: unknown = null): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (_sessionToken) {
    ;(opts.headers as Record<string, string>)['X-Session-Token'] = _sessionToken
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(BACKEND_URL + path, opts)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any).error || `HTTP ${res.status}`)
  }
  return data as T
}

export interface BackendSession {
  sessionToken: string
  uid: string
  email: string
  displayName: string
  photoURL: string
  isAdmin: boolean
}

export const API = {
  // ── Auth ──
  async verifyIdToken(idToken: string): Promise<BackendSession> {
    const data = await call<BackendSession>('POST', '/auth/verify', { idToken })
    setSession(data.sessionToken)
    return data
  },
  async getMe(): Promise<{ isAdmin: boolean; uid: string; email: string }> {
    return call('POST', '/auth/me')
  },

  // ── Password ──
  async verifyPassword(password: string): Promise<{ valid: boolean; needsInit?: boolean }> {
    return call('POST', '/password/verify', { password })
  },
  async initPassword(password: string) {
    return call('POST', '/password/init', { password })
  },
  async changePassword(oldPassword: string, newPassword: string) {
    return call('POST', '/password/change', { oldPassword, newPassword })
  },

  // ── Admin ──
  async blockUser(targetUid: string, roomId: string, block: boolean) {
    return call('POST', '/admin/block-user', { targetUid, roomId, block })
  },
  async kickUser(targetUid: string, roomId: string) {
    return call('POST', '/admin/kick-user', { targetUid, roomId })
  },
  async deleteRoom(roomId: string) {
    return call('POST', '/admin/delete-room', { roomId })
  },
  async clearChat(roomId: string) {
    return call('POST', '/admin/clear-chat', { roomId })
  },
  async createRoom(name: string, icon: string, description: string, password: string) {
    return call<{ success: boolean; roomId: string }>('POST', '/admin/create-room', {
      name,
      icon,
      description,
      password,
    })
  },
  async broadcast(message: string) {
    return call('POST', '/admin/broadcast', { message })
  },
  async getUsers(): Promise<{ users: Record<string, any> }> {
    return call('GET', '/admin/users')
  },
}
