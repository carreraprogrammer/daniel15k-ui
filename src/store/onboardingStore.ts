import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tracks whether a user has finished first-run onboarding.
// `undefined` for a user id means "not yet resolved" — the gate will check the
// backend (financial_context) once and cache the result here.

interface OnboardingState {
  completed: Record<number, boolean>
  isComplete: (userId: number) => boolean | undefined
  markComplete: (userId: number) => void
  setStatus: (userId: number, complete: boolean) => void
  reset: (userId: number) => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completed: {},
      isComplete: (userId) => get().completed[userId],
      markComplete: (userId) => set((s) => ({ completed: { ...s.completed, [userId]: true } })),
      setStatus: (userId, complete) => set((s) => ({ completed: { ...s.completed, [userId]: complete } })),
      reset: (userId) => set((s) => {
        const next = { ...s.completed }
        delete next[userId]
        return { completed: next }
      }),
    }),
    { name: 'onboarding_status' },
  ),
)
