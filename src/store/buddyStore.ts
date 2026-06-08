import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Persona = 'nilo' | 'pip' | 'teo'
export type Emotion = 'calm' | 'happy' | 'think' | 'worry' | 'cheer' | 'sleep'

export const PERSONAS = {
  nilo: {
    name: 'Nilo',
    trait: 'el calmado',
    color: '#5FB58A',
    line: 'Va contigo despacio. Respira hondo y te baja las pulsaciones.',
    voice: 'Paciente, en voz baja. Nunca te apura.',
    motion: 0.78,
    round: 1.0,
    pupil: 1.0,
  },
  pip: {
    name: 'Pip',
    trait: 'el juguetón',
    color: '#E6B656',
    line: 'Celebra cada paso. Rebota cuando algo te sale bien.',
    voice: 'Cálido y animado. Le pone chispa al día.',
    motion: 1.28,
    round: 1.07,
    pupil: 1.12,
  },
  teo: {
    name: 'Teo',
    trait: 'el analítico',
    color: '#7CA6E0',
    line: 'Te da los números claros. Mira, calcula y asiente.',
    voice: 'Directo y preciso. Va al grano sin frialdad.',
    motion: 1.0,
    round: 0.93,
    pupil: 0.88,
  },
} as const satisfies Record<Persona, {
  name: string
  trait: string
  color: string
  line: string
  voice: string
  motion: number
  round: number
  pupil: number
}>

export const EMOTIONS = {
  calm:  { label: 'Tranquilo', ctx: 'Todo va en orden',       amp: 4,   dur: 4.2,  glow: 0.55 },
  happy: { label: 'Contento',  ctx: 'Lograste algo',          amp: 9,   dur: 1.15, glow: 0.9  },
  think: { label: 'Pensando',  ctx: 'Analizando tu mes',      amp: 2.5, dur: 3.0,  glow: 0.42 },
  worry: { label: 'Atento',    ctx: 'Ojo con esto',           amp: 2,   dur: 1.5,  glow: 0.52 },
  cheer: { label: 'Animando',  ctx: 'Tú puedes con esto',     amp: 7,   dur: 0.95, glow: 0.98 },
  sleep: { label: 'Dormido',   ctx: 'De noche, en reposo',    amp: 2.5, dur: 5.2,  glow: 0.26 },
} as const satisfies Record<Emotion, { label: string; ctx: string; amp: number; dur: number; glow: number }>

interface BuddyState {
  persona: Persona
  setPersona: (persona: Persona) => void
}

export const useBuddyStore = create<BuddyState>()(
  persist(
    (set) => ({
      persona: 'pip',
      setPersona: (persona) => set({ persona }),
    }),
    { name: 'ascent-buddy-persona' },
  ),
)
