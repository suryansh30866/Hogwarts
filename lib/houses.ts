/**
 * The four fixed rooms = the four Hogwarts houses.
 * These are "default" rooms: they use the global master key (no per-room
 * password), so any signed-in & password-verified member can enter them.
 */

export interface House {
  id: string
  name: string
  /** Single-letter crest fallback used when no image is provided. */
  icon: string
  motto: string
  description: string
  /** Tailwind text color token. */
  colorVar: string
  /** Hex used for inline gradients/accents. */
  hex: string
  /*
    IMAGE PLACEHOLDER:
    Drop a crest image at /public/houses/<id>.png and set `crest` to the path.
    e.g. crest: '/houses/gryffindor.png'
  */
  crest?: string
}

export const HOUSES: House[] = [
  {
    id: 'gryffindor',
    name: 'Gryffindor',
    icon: 'G',
    motto: 'Courage, daring, nerve and chivalry',
    description: 'The brave at heart gather by the fire.',
    colorVar: 'var(--house-gryffindor)',
    hex: '#a02c2c',
    crest: '/houses/gryffindor.png',
  },
  {
    id: 'slytherin',
    name: 'Slytherin',
    icon: 'S',
    motto: 'Ambition, cunning and resourcefulness',
    description: 'The cunning find their kind in the dungeons.',
    colorVar: 'var(--house-slytherin)',
    hex: '#1f5c3d',
    crest: '/houses/slytherin.png',
  },
  {
    id: 'ravenclaw',
    name: 'Ravenclaw',
    icon: 'R',
    motto: 'Wit, learning and wisdom',
    description: 'The clever speak in the tower of wit.',
    colorVar: 'var(--house-ravenclaw)',
    hex: '#2a4a7c',
    crest: '/houses/ravenclaw.png',
  },
  {
    id: 'hufflepuff',
    name: 'Hufflepuff',
    icon: 'H',
    motto: 'Hard work, patience, loyalty and fair play',
    description: 'The loyal and just keep warm together.',
    colorVar: 'var(--house-hufflepuff)',
    hex: '#c9a227',
    crest: '/houses/hufflepuff.png',
  },
]

export function getHouse(id: string | null | undefined): House | undefined {
  if (!id) return undefined
  return HOUSES.find((h) => h.id === id)
}
