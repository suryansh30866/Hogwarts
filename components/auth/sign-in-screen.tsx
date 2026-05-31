'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/components/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, ShieldCheck, KeyRound, Loader2 } from 'lucide-react'

/*
  VIDEO PLACEHOLDER:
  Drop your background videos in /public/ui/ named main1.mp4 ... main4.mp4
  (same names your original design.js used). One is chosen at random on load.
  If a video is missing, the poster image / solid background shows instead.
*/
const BACKGROUND_VIDEOS = ['/ui/main1.mp4', '/ui/main2.mp4', '/ui/main3.mp4', '/ui/main4.mp4']

export function SignInScreen() {
  const { stage, signIn, submitPassword } = useApp()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  // Pick a random background video on mount (ported from design.js logic).
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const selected = BACKGROUND_VIDEOS[Math.floor(Math.random() * BACKGROUND_VIDEOS.length)]
    const source = document.createElement('source')
    source.src = selected
    source.type = 'video/mp4'
    el.appendChild(source)
    el.load()
    el.play().catch(() => {})
  }, [])

  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setError(null)
    setBusy(true)
    const res = await submitPassword(password)
    setBusy(false)
    if (!res.ok) {
      setError(res.error || 'Incorrect password')
      setPassword('')
    }
  }

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-5">
      {/* Background video layer */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        // POSTER PLACEHOLDER: add /public/ui/poster.jpg for a fallback still frame
        poster="/ui/poster.jpg"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/75" aria-hidden="true" />

      {/* Title */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <h1 className="font-display text-5xl font-light tracking-[0.35em] text-white sm:text-6xl">
          HOGWARTS
        </h1>
        <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-[0.5em] text-white/60">
          Secrets of Chamber
        </p>

        {/* Card */}
        <div className="mt-10 w-full rounded-2xl border border-white/15 bg-black/35 p-7 shadow-2xl backdrop-blur-xl">
          {stage === 'signin' ? (
            <div className="flex flex-col items-center gap-6">
              <h2 className="font-display text-2xl text-white">Sign in to continue</h2>
              <Button
                onClick={handleGoogle}
                disabled={busy}
                size="lg"
                className="h-12 w-full bg-white text-black hover:bg-white/90"
              >
                {busy ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <GoogleIcon className="size-5" />
                )}
                <span className="font-medium">{busy ? 'Connecting…' : 'Continue with Google'}</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePassword} className="flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <span className="flex size-11 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <KeyRound className="size-5 text-primary" />
                </span>
                <h2 className="font-display text-2xl text-white">Enter the passphrase</h2>
                <p className="text-center text-xs leading-relaxed text-white/50">
                  This unlocks end-to-end decryption on this device.
                </p>
              </div>
              <Input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Common room passphrase"
                className="h-12 border-white/20 bg-white/10 text-center text-white placeholder:text-white/40"
              />
              <Button
                type="submit"
                disabled={busy || !password.trim()}
                size="lg"
                className="h-12 w-full"
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
                {busy ? 'Verifying…' : 'Unlock'}
              </Button>
            </form>
          )}

          {error && (
            <p className="mt-4 text-center text-xs text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-white/10 pt-5 text-center">
            <span className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-white/45">
              <ShieldCheck className="size-3.5" />
              End-to-end encrypted
            </span>
            <p className="text-[0.68rem] leading-relaxed text-white/35">
              AES-256-GCM · PBKDF2 key derivation
              <br />
              Zero knowledge — we cannot read your chats
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
