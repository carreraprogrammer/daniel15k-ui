import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { financeService } from '../services/financeService'

let inflight = false

/**
 * Resolves first-run onboarding status for the current user and caches it in the
 * onboarding store. Call once near the router root. For users without a local
 * flag (e.g. existing accounts, or a fresh device) it checks the backend: a
 * present financial_context means onboarding was already done.
 *
 * Returns `true | false | undefined` (undefined = still resolving).
 */
export function useOnboardingStatus(): boolean | undefined {
  const userId = useAuthStore((s) => s.user?.id)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const status = useOnboardingStore((s) => (userId != null ? s.completed[userId] : undefined))
  const setStatus = useOnboardingStore((s) => s.setStatus)

  useEffect(() => {
    if (!isAuthenticated || userId == null || status !== undefined || inflight) return
    inflight = true
    financeService
      .fetchFinancialContext()
      .then((ctx) => setStatus(userId, Boolean(ctx && ctx.phase)))
      .catch(() => setStatus(userId, false))
      .finally(() => { inflight = false })
  }, [isAuthenticated, userId, status, setStatus])

  return status
}
