import { useHistory } from 'react-router-dom'
import { OnboardingFlow } from '../../organisms/Onboarding/OnboardingFlow'
import { onboardingService } from '../../../services/onboardingService'
import { useAuthStore } from '../../../store/authStore'
import { useOnboardingStore } from '../../../store/onboardingStore'
import type { OnbData } from '../../organisms/Onboarding/types'
import '../../organisms/Onboarding/onboarding.css'

export const OnboardingPage = ({ preview = false }: { preview?: boolean }) => {
  const history = useHistory()
  const userId = useAuthStore((s) => s.user?.id)
  const markComplete = useOnboardingStore((s) => s.markComplete)

  const handlePersist = async (data: OnbData) => {
    // Preview mode (dev/superadmin): run the whole flow with zero writes so it
    // can be tested repeatedly on a real account without touching its data.
    if (preview) {
      // eslint-disable-next-line no-console
      console.log('[onboarding preview] no se guarda nada. Esto se habría persistido:', data)
      return
    }
    await onboardingService.persist(data)
    if (userId) markComplete(userId)
  }

  const handleEnterApp = () => {
    history.replace('/dashboard')
  }

  return (
    <div className="ob2-root">
      <OnboardingFlow onPersist={handlePersist} onEnterApp={handleEnterApp} />
    </div>
  )
}

export default OnboardingPage
