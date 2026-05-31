'use client'

import { useState } from 'react'
import type { House } from '@/lib/houses'

/**
 * Renders a house crest image if present in /public/houses,
 * otherwise falls back to a colored monogram badge.
 */
export function HouseCrest({ house, size = 40 }: { house: House; size?: number }) {
  const [failed, setFailed] = useState(false)
  const showImage = house.crest && !failed

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: showImage ? 'transparent' : house.hex,
        fontSize: size * 0.42,
      }}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={house.crest || '/placeholder.svg'}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        house.icon
      )}
    </span>
  )
}
