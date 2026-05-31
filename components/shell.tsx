'use client'

import { useApp } from '@/components/app-context'
import { SignInScreen } from '@/components/auth/sign-in-screen'
import { HomeScreen } from '@/components/home/home-screen'
import { Loader2 } from 'lucide-react'

export function Shell() {
  const { stage } = useApp()

  if (stage === 'loading') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="font-display text-lg tracking-widest text-muted-foreground">HOGWARTS</p>
        </div>
      </main>
    )
  }

  if (stage === 'signin' || stage === 'password') {
    return <SignInScreen />
  }

  return <HomeScreen />
}
