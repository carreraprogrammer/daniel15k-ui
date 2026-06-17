import { useState } from 'react'
import { Buddy } from '../../atoms/Buddy/Buddy'
import { Icon } from './OnboardingIcons'
import {
  WelcomeScreen,
  MotivationScreen,
  BalanceScreen,
  FundScreen,
  ExpensesScreen,
  IncomeScreen,
} from './CaptureScreens'
import { ClosingScreen } from './ClosingScreen'
import { freshData } from './types'
import type { OnbData } from './types'

const RAIL_LABELS = ['Tu meta', 'Hoy', 'Colchón', 'Gastos', 'Ingresos']

function ProgressRail({ step, onBack, onPause }: { step: number; onBack: () => void; onPause: () => void }) {
  const idx = step - 1
  return (
    <div className="ob2-head">
      <button className="ob2-back" onClick={onBack}><Icon.Left size={18} /></button>
      <div className="ob2-rail">
        {RAIL_LABELS.map((_, i) => (
          <div key={i} className={`ob2-rail-seg ${i < idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}><div className="fill" /></div>
        ))}
      </div>
      <button className="ob2-pause" onClick={onPause}><Icon.Calendar size={13} /> Pausar</button>
    </div>
  )
}

function PauseSheet({ data, step, onResume, onExit }: { data: OnbData; step: number; onResume: () => void; onExit: () => void }) {
  const coach = data.coach ?? 'nilo'
  return (
    <>
      <div className="ob2-sheet-bd" onClick={onResume} />
      <div className="ob2-sheet">
        <div className="sh-handle" />
        <div className="sh-coach">
          <Buddy persona={coach} emotion="calm" size={48} />
          <div className="sh-say">
            <div className="sh-t">Tranquilo, esto te espera.</div>
            <div className="sh-s">Guardé todo lo que llevas. Cuando vuelvas, seguimos justo donde lo dejaste — sin empezar de cero.</div>
          </div>
        </div>
        <div className="sh-saved">
          <div className="sv-ic"><Icon.Check size={16} /></div>
          <div>
            <div className="sv-t">Avance guardado · paso {step} de 5</div>
            <div className="sv-s">{RAIL_LABELS[step - 1]}</div>
          </div>
        </div>
        <button className="ob2-cta" onClick={onResume}>Seguir ahora <Icon.Right size={16} /></button>
        <button className="ob2-cta ghost" onClick={onExit}>Salir, sigo después</button>
      </div>
    </>
  )
}

function PausedScreen({ data, step, onResume }: { data: OnbData; step: number; onResume: () => void }) {
  const coach = data.coach ?? 'nilo'
  return (
    <div className="ob2-welcome" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Buddy persona={coach} emotion="sleep" size={120} />
      <div className="w-eyebrow" style={{ marginTop: 18 }}>En pausa</div>
      <h1 className="w-title" style={{ fontSize: 26 }}>Te guardé el avance.</h1>
      <p className="w-body">Vas en el paso {step} de 5 — <b>{RAIL_LABELS[step - 1]}</b>. Aquí sigue, sin afán. Cuando quieras, retomamos.</p>
      <div style={{ flex: 1, minHeight: 20 }} />
      <button className="ob2-cta" onClick={onResume}>Retomar mi plan <Icon.Right size={16} /></button>
    </div>
  )
}

function CompletedScreen({ data, onEnter }: { data: OnbData; onEnter: () => void }) {
  const coach = data.coach ?? 'nilo'
  return (
    <div className="ob2-welcome" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <Buddy persona={coach} emotion="happy" size={118} />
      <div className="ob2-close-xp" style={{ marginTop: 16 }}><Icon.Flame size={13} /> Racha iniciada · día 1</div>
      <h1 className="w-title" style={{ fontSize: 26, marginTop: 16 }}>Tu plan está listo.</h1>
      <p className="w-body">
        De aquí en adelante, no estás solo con tu plata. Tu coach te espera en el Dashboard con tu primer movimiento.
      </p>
      <div style={{ flex: 1, minHeight: 20 }} />
      <button className="ob2-cta" onClick={onEnter}>Entrar a mi plan <Icon.Right size={16} /></button>
    </div>
  )
}

export function OnboardingFlow({
  onPersist,
  onEnterApp,
}: {
  onPersist: (data: OnbData) => Promise<void>
  onEnterApp: () => void
}) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnbData>(freshData)
  const [paused, setPaused] = useState(false)
  const [showPause, setShowPause] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const coach = data.coach ?? 'nilo'
  const update = (patch: Partial<OnbData>) => setData((d) => ({ ...d, ...patch }))
  const go = (s: number) => {
    setError('')
    setStep(s)
    requestAnimationFrame(() => {
      document.querySelectorAll('.ob2-scroll, .ob2-close-scroll, .ob2-welcome').forEach((el) => { (el as HTMLElement).scrollTop = 0 })
    })
  }

  const validate = (): string => {
    if (step === 1 && data.motivation.chips.length === 0 && !data.motivation.note.trim())
      return 'Elige al menos una, o cuéntame con tus palabras.'
    if (step === 2 && (!data.balance || data.balance <= 0))
      return 'Pon un monto para arrancar — cualquiera está bien.'
    if (step === 3 && data.fund.has === null)
      return 'Cuéntame: ¿sí o todavía no?'
    if (step === 4 && data.expenses.length === 0)
      return 'Agrega al menos un gasto del mes.'
    if (step === 4 && data.expenses.some((e) => e.isCredit && !e.resolved))
      return 'Termina el crédito que detecté arriba 👆'
    if (step === 5) {
      if (!data.income.type) return 'Dime cómo te entra la plata.'
      if (data.income.type === 'fixed' && (!data.income.amount || data.income.amount <= 0)) return 'Pon cuánto entra cada vez.'
      if (data.income.type === 'variable' && (!data.income.floor || data.income.floor <= 0)) return 'Pon tu piso confiable.'
    }
    return ''
  }

  const next = () => {
    const err = validate()
    if (err) { setError(err); return }
    go(step + 1)
  }

  const ctaLabel = ({ 1: 'Continuar', 2: 'Continuar', 3: 'Continuar', 4: 'Listo, mis gastos', 5: 'Ver mi plan' } as Record<number, string>)[step]

  // closing → persist → completed
  const handleClosingEnter = async () => {
    setSaving(true)
    setError('')
    try {
      await onPersist(data)
      go(7)
    } catch {
      setError('No pude guardar tu plan. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  let body: React.ReactNode

  if (paused) {
    body = <PausedScreen data={data} step={Math.max(1, step)} onResume={() => setPaused(false)} />
  } else if (step === 0) {
    body = <WelcomeScreen data={data} update={update} go={go} />
  } else if (step >= 1 && step <= 5) {
    const screens: Record<number, React.ReactNode> = {
      1: <MotivationScreen data={data} update={update} coach={coach} />,
      2: <BalanceScreen data={data} update={update} coach={coach} error={step === 2 ? error : ''} />,
      3: <FundScreen data={data} update={update} coach={coach} />,
      4: <ExpensesScreen data={data} update={update} coach={coach} />,
      5: <IncomeScreen data={data} update={update} coach={coach} />,
    }
    body = (
      <>
        <ProgressRail step={step} onBack={() => go(step - 1)} onPause={() => setShowPause(true)} />
        {screens[step]}
        <div className="ob2-foot">
          {error && step !== 2 && <div className="ob2-error"><Icon.Bell size={13} /> {error}</div>}
          <button className="ob2-cta" onClick={next}>{ctaLabel} <Icon.Right size={16} /></button>
        </div>
      </>
    )
  } else if (step === 6) {
    body = (
      <>
        <ClosingScreen data={data} onEnter={handleClosingEnter} saving={saving} />
        {error && (
          <div className="ob2-foot" style={{ paddingTop: 0 }}>
            <div className="ob2-error"><Icon.Bell size={13} /> {error}</div>
          </div>
        )}
      </>
    )
  } else {
    body = <CompletedScreen data={data} onEnter={onEnterApp} />
  }

  return (
    <div className="ob2">
      {body}
      {showPause && (
        <PauseSheet
          data={data}
          step={Math.max(1, step)}
          onResume={() => setShowPause(false)}
          onExit={() => { setShowPause(false); setPaused(true) }}
        />
      )}
    </div>
  )
}
