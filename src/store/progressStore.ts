import { create } from 'zustand'
import { api } from '../services/api'

export const LEVEL_NAMES = [
  'Huevo',
  'Pulso',
  'Conciencia',
  'Estructura',
  'Estrategia',
  'Sistema Nervioso',
] as const

interface ProgressData {
  xp: number
  level: number
  streakDays: number
  readinessScore: number
  avatarSeed: string
  bypassReadiness: boolean
  nextLevelXp: number | null
}

interface ProgressState {
  data: ProgressData | null
  loading: boolean
  previewLevel: number | null
  fetchProgress: () => Promise<void>
  setPreviewLevel: (level: number) => void
  getEffectiveLevel: () => number
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  data: null,
  loading: false,
  previewLevel: null,

  fetchProgress: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const { data } = await api.get('/api/v1/me/progress')
      const attrs = data.data
      set({
        data: {
          xp:              attrs.xp,
          level:           attrs.level,
          streakDays:      attrs.streak_days,
          readinessScore:  attrs.readiness_score,
          avatarSeed:      attrs.avatar_seed,
          bypassReadiness: attrs.bypass_readiness,
          nextLevelXp:     attrs.next_level_xp,
        },
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  setPreviewLevel: (level: number) => set({ previewLevel: level }),

  getEffectiveLevel: () => {
    const { data, previewLevel } = get()
    if (data?.bypassReadiness && previewLevel !== null) return previewLevel
    return data?.level ?? 0
  },
}))
