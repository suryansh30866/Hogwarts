'use client'

import { HOUSES } from '@/lib/houses'
import { HouseCrest } from '@/components/home/house-crest'
import { Button } from '@/components/ui/button'
import { Menu, ArrowRight } from 'lucide-react'

interface HousesGridProps {
  onOpenHouse: (id: string) => void
  onOpenMobileNav: () => void
}

export function HousesGrid({ onOpenHouse, onOpenMobileNav }: HousesGridProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Top bar (mobile menu trigger) */}
      <header className="flex items-center gap-3 border-b border-border px-5 py-4 md:hidden">
        <Button variant="ghost" size="icon" onClick={onOpenMobileNav}>
          <Menu className="size-5" />
        </Button>
        <span className="font-display text-xl tracking-[0.2em]">HOGWARTS</span>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-10 text-center">
            <h1 className="text-balance font-display text-4xl text-foreground sm:text-5xl">
              Choose your common room
            </h1>
            <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Four houses, one castle. Every message is end-to-end encrypted and visible only to
              those who hold the passphrase.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {HOUSES.map((house) => (
              <button
                key={house.id}
                onClick={() => onOpenHouse(house.id)}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-lg"
              >
                {/* Accent wash */}
                <span
                  className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                  style={{ background: house.hex }}
                  aria-hidden="true"
                />
                <div className="relative flex items-start gap-4">
                  <HouseCrest house={house} size={56} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-2xl text-foreground">{house.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{house.description}</p>
                    <p className="mt-3 text-xs italic text-muted-foreground/70">{house.motto}</p>
                  </div>
                </div>
                <div className="relative mt-5 flex items-center gap-1.5 text-sm font-medium text-primary">
                  Enter room
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
