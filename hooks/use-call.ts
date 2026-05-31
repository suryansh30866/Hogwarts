'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getFirebase,
  listenToValue,
  listenToNewChildren,
  updateData,
  removeData,
  pushData,
  serverTimestamp,
} from '@/lib/firebase'
import { onDisconnect, ref } from 'firebase/database'
import type { User } from 'firebase/auth'
import type { ActiveCall, CallType } from '@/lib/types'

/*
  Group calling over a WebRTC mesh, signalled through Firebase RTDB.
  Suitable for a small private group (a handful of people per call).

  Signaling layout in RTDB:
    calls/<scope>/meta                         -> ActiveCall (or null when ended)
    calls/<scope>/participants/<uid>           -> { displayName, photoURL, joinedAt }
    calls/<scope>/signals/<toUid>/<fromUid>/*  -> { kind, data }

  STUN only (public Google STUN). For users behind strict/symmetric NATs you
  may need to add a TURN server below — see ICE_SERVERS.
*/
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN PLACEHOLDER (recommended for production reliability):
    // { urls: 'turn:YOUR_TURN_HOST:3478', username: 'user', credential: 'pass' },
  ],
}

export interface RemoteStream {
  uid: string
  displayName: string
  photoURL: string
  stream: MediaStream
  hasVideo: boolean
}

export interface CallState {
  active: ActiveCall | null
  inCall: boolean
  type: CallType | null
  localStream: MediaStream | null
  remoteStreams: RemoteStream[]
  micOn: boolean
  camOn: boolean
}

export function useCall(scope: string, user: User | null) {
  const [active, setActive] = useState<ActiveCall | null>(null)
  const [inCall, setInCall] = useState(false)
  const [type, setType] = useState<CallType | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const cleanupsRef = useRef<Array<() => void>>([])
  const peerMetaRef = useRef<Map<string, { displayName: string; photoURL: string }>>(new Map())

  // Listen to whether a call is active in this scope (so we can show "join" UI).
  useEffect(() => {
    const unsub = listenToValue(`calls/${scope}/meta`, (val: ActiveCall | null) => {
      setActive(val && val.callId ? val : null)
    })
    return () => unsub()
  }, [scope])

  const updateRemote = useCallback((uid: string, mutate: (r: RemoteStream) => RemoteStream) => {
    setRemoteStreams((prev) => {
      const idx = prev.findIndex((r) => r.uid === uid)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = mutate(next[idx])
      return next
    })
  }, [])

  const createPeer = useCallback(
    (peerUid: string, polite: boolean) => {
      if (!user) return null
      if (peersRef.current.has(peerUid)) return peersRef.current.get(peerUid)!

      const pc = new RTCPeerConnection(ICE_SERVERS)
      peersRef.current.set(peerUid, pc)

      // Add local tracks.
      const ls = localStreamRef.current
      if (ls) ls.getTracks().forEach((t) => pc.addTrack(t, ls))

      // Send ICE candidates.
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          pushData(`calls/${scope}/signals/${peerUid}/${user.uid}`, {
            kind: 'candidate',
            data: JSON.stringify(e.candidate),
          }).catch(() => {})
        }
      }

      // Remote track arrives.
      pc.ontrack = (e) => {
        const [stream] = e.streams
        const meta = peerMetaRef.current.get(peerUid) || { displayName: 'Member', photoURL: '' }
        setRemoteStreams((prev) => {
          const existing = prev.find((r) => r.uid === peerUid)
          const hasVideo = stream.getVideoTracks().length > 0
          if (existing) {
            return prev.map((r) =>
              r.uid === peerUid ? { ...r, stream, hasVideo } : r,
            )
          }
          return [
            ...prev,
            {
              uid: peerUid,
              displayName: meta.displayName,
              photoURL: meta.photoURL,
              stream,
              hasVideo,
            },
          ]
        })
      }

      // Negotiation (perfect negotiation lite — the "impolite" peer initiates).
      pc.onnegotiationneeded = async () => {
        if (polite) return
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await pushData(`calls/${scope}/signals/${peerUid}/${user.uid}`, {
            kind: 'offer',
            data: JSON.stringify(pc.localDescription),
          })
        } catch {}
      }

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          // Peer left or connection dropped; remove their tile.
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setRemoteStreams((prev) => prev.filter((r) => r.uid !== peerUid))
          }
        }
      }

      return pc
    },
    [scope, user],
  )

  const closePeer = useCallback((peerUid: string) => {
    const pc = peersRef.current.get(peerUid)
    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onnegotiationneeded = null
      pc.close()
      peersRef.current.delete(peerUid)
    }
    setRemoteStreams((prev) => prev.filter((r) => r.uid !== peerUid))
  }, [])

  // Core join routine shared by start/join.
  const enter = useCallback(
    async (callType: CallType, asStarter: boolean) => {
      if (!user || inCall) return
      // 1. Acquire local media.
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? { width: 640, height: 480 } : false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      setType(callType)
      setMicOn(true)
      setCamOn(callType === 'video')
      setInCall(true)

      const { db } = getFirebase()

      // 2. Register call meta (only starter creates it; joiners leave it intact).
      if (asStarter) {
        await updateData(`calls/${scope}/meta`, {
          callId: `${Date.now()}_${user.uid}`,
          type: callType,
          startedBy: user.uid,
          startedByName: user.displayName || 'Anonymous',
          startedAt: serverTimestamp(),
        })
      }

      // 3. Register as participant + auto-cleanup on disconnect.
      const myPartRef = ref(db, `calls/${scope}/participants/${user.uid}`)
      await updateData(`calls/${scope}/participants/${user.uid}`, {
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        joinedAt: serverTimestamp(),
      })
      onDisconnect(myPartRef).remove().catch(() => {})
      const mySignalsRef = ref(db, `calls/${scope}/signals/${user.uid}`)
      onDisconnect(mySignalsRef).remove().catch(() => {})

      // 4. Watch participants -> create/destroy peer connections.
      const unsubParts = listenToValue(
        `calls/${scope}/participants`,
        (data: Record<string, any> | null) => {
          const parts = data || {}
          const uids = Object.keys(parts).filter((u) => u !== user.uid)
          // Track meta for tiles.
          for (const uid of uids) {
            peerMetaRef.current.set(uid, {
              displayName: parts[uid].displayName || 'Member',
              photoURL: parts[uid].photoURL || '',
            })
          }
          // New peers: the one with the lexicographically smaller uid is "impolite" (initiator).
          for (const uid of uids) {
            if (!peersRef.current.has(uid)) {
              const polite = user.uid > uid // smaller uid initiates
              createPeer(uid, polite)
            }
          }
          // Gone peers.
          for (const uid of Array.from(peersRef.current.keys())) {
            if (!uids.includes(uid)) closePeer(uid)
          }
          // If everyone left, clear meta.
          if (uids.length === 0 && asStarter) {
            // keep meta until we leave
          }
        },
      )
      cleanupsRef.current.push(unsubParts)

      // 5. Listen for inbound signals addressed to me.
      const unsubSignals = listenToNewChildren(
        `calls/${scope}/signals/${user.uid}`,
        () => {
          /* fromUid level handled below */
        },
      )
      // We actually need per-sender streams; use a value listener instead.
      unsubSignals()
      const unsubSig = listenToValue(
        `calls/${scope}/signals/${user.uid}`,
        async (bySender: Record<string, Record<string, any>> | null) => {
          if (!bySender) return
          for (const [fromUid, msgs] of Object.entries(bySender)) {
            const pc =
              peersRef.current.get(fromUid) || createPeer(fromUid, user.uid > fromUid) || null
            if (!pc) continue
            for (const [msgId, msg] of Object.entries(msgs)) {
              try {
                const payload = JSON.parse(msg.data)
                if (msg.kind === 'offer') {
                  await pc.setRemoteDescription(payload)
                  const answer = await pc.createAnswer()
                  await pc.setLocalDescription(answer)
                  await pushData(`calls/${scope}/signals/${fromUid}/${user.uid}`, {
                    kind: 'answer',
                    data: JSON.stringify(pc.localDescription),
                  })
                } else if (msg.kind === 'answer') {
                  if (pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(payload)
                  }
                } else if (msg.kind === 'candidate') {
                  await pc.addIceCandidate(payload).catch(() => {})
                }
              } catch {}
              // Consume the signal so it isn't reprocessed.
              removeData(`calls/${scope}/signals/${user.uid}/${fromUid}/${msgId}`).catch(() => {})
            }
          }
        },
      )
      cleanupsRef.current.push(unsubSig)
    },
    [scope, user, inCall, createPeer, closePeer],
  )

  const startCall = useCallback((callType: CallType) => enter(callType, true), [enter])
  const joinCall = useCallback(
    (callType?: CallType) => enter(callType || active?.type || 'voice', false),
    [enter, active],
  )

  const leaveCall = useCallback(async () => {
    if (!user) return
    cleanupsRef.current.forEach((fn) => fn())
    cleanupsRef.current = []
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStreams([])
    setInCall(false)
    setType(null)

    await removeData(`calls/${scope}/participants/${user.uid}`).catch(() => {})
    await removeData(`calls/${scope}/signals/${user.uid}`).catch(() => {})

    // If no participants remain, tear down the call meta.
    const { db } = getFirebase()
    const snap = await import('firebase/database').then(({ get }) =>
      get(ref(db, `calls/${scope}/participants`)),
    )
    if (!snap.exists()) {
      await removeData(`calls/${scope}/meta`).catch(() => {})
      await removeData(`calls/${scope}/signals`).catch(() => {})
    }
  }, [scope, user])

  const toggleMic = useCallback(() => {
    const ls = localStreamRef.current
    if (!ls) return
    const enabled = !micOn
    ls.getAudioTracks().forEach((t) => (t.enabled = enabled))
    setMicOn(enabled)
  }, [micOn])

  const toggleCam = useCallback(() => {
    const ls = localStreamRef.current
    if (!ls) return
    const enabled = !camOn
    ls.getVideoTracks().forEach((t) => (t.enabled = enabled))
    setCamOn(enabled)
  }, [camOn])

  // Clean up if the component unmounts while in a call.
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        cleanupsRef.current.forEach((fn) => fn())
        peersRef.current.forEach((pc) => pc.close())
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        if (user) {
          removeData(`calls/${scope}/participants/${user.uid}`).catch(() => {})
          removeData(`calls/${scope}/signals/${user.uid}`).catch(() => {})
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const state: CallState = { active, inCall, type, localStream, remoteStreams, micOn, camOn }
  return { ...state, startCall, joinCall, leaveCall, toggleMic, toggleCam }
}
