/**
 * Data + admin operations, backed entirely by Firebase Realtime Database.
 *
 * There is NO separate server. Authentication is handled by Firebase Auth
 * (Google sign-in), admin rights live at `global/admins/{uid}`, and the
 * chamber passphrase is verified client-side (see components/app-context.tsx).
 * Every message stored in the database is end-to-end encrypted, so the
 * database only ever holds ciphertext.
 *
 * NOTE: Access control for these operations is enforced by Firebase Realtime
 * Database Security Rules on the `kwit-5dde3` project (e.g. only users listed
 * under `global/admins` may write to other members / delete messages).
 */
import { readData, removeData, updateData } from '@/lib/firebase'

export const API = {
  // ── Directory ──
  async getUsers(): Promise<{ users: Record<string, any> }> {
    const users = await readData<Record<string, any>>('users')
    return { users: users || {} }
  },

  // ── Moderation (admin) ──
  async blockUser(targetUid: string, roomId: string, block: boolean) {
    await updateData(`rooms/${roomId}/members/${targetUid}`, { blocked: block })
    return { success: true }
  },

  async kickUser(targetUid: string, roomId: string) {
    await removeData(`rooms/${roomId}/members/${targetUid}`)
    return { success: true }
  },

  async clearChat(roomId: string) {
    await removeData(`messages/${roomId}`)
    return { success: true }
  },

  async deleteRoom(roomId: string) {
    await removeData(`messages/${roomId}`)
    await removeData(`rooms/${roomId}`)
    return { success: true }
  },
}
