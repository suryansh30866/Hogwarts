export interface ChatMessage {
  id: string
  text: string
  type: 'text' | 'image' | 'file'
  fileData: string | null
  author: string
  displayName: string
  photoURL: string
  timestamp: number
  isMe: boolean
  error?: boolean
}

export interface RoomMember {
  uid: string
  displayName: string
  email: string
  photoURL: string
  online: boolean
  isAdmin: boolean
  blocked: boolean
}

export interface DirectoryUser {
  uid: string
  displayName: string
  email: string
  photoURL: string
  online: boolean
  currentRoomName?: string | null
}

/* ── WebRTC calling ── */
export type CallType = 'voice' | 'video'

export interface CallParticipant {
  uid: string
  displayName: string
  photoURL: string
  joinedAt: number
}

export interface ActiveCall {
  callId: string
  type: CallType
  startedBy: string
  startedByName: string
  startedAt: number
  participants: Record<string, CallParticipant>
}
