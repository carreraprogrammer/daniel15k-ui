import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Persona } from '../../../store/buddyStore'
import { PERSONAS } from '../../../store/buddyStore'
import { Buddy } from '../../atoms/Buddy/Buddy'
import { Icon } from './OnboardingIcons'
import { fmtCOP } from './helpers'
import type { OnbData } from './types'

// The closing first-coaching screen. The strategy is DERIVED (deterministic:
// deuda × fondo × ingreso), then justified with the user's OWN numbers and
// their "para qué" — never with abstract rules (§7 of the design brief).

const MOTIV_PHRASE: Record<string, string> = {
  deuda: 'salir de deudas',
  finmes: 'llegar tranquilo a fin de mes',
  ahorro: 'empezar a ahorrar',
  estres: 'dejar de estresarte con la plata',
  claridad: 'entender en qué se te va',
  patrimonio: 'construir algo a futuro',
}

export type CaseId = 'starter' | 'debt' | 'emergency' | 'investing'
export type Phase = CaseId
export type Strategy = 'snowball' | 'avalanche' | null

const PHASE_VIS: Record<CaseId, { color: string; icon: keyof typeof Icon; kicker: string }> = {
  starter: { color: 'var(--necessary)', icon: 'Heart', kicker: 'Tu primer objetivo' },
  debt: { color: 'var(--committed)', icon: 'Card', kicker: 'Tu primer objetivo' },
  emergency: { color: 'var(--income)', icon: 'Target', kicker: 'Tu primer objetivo' },
  investing: { color: 'var(--investment)', icon: 'Trend', kicker: 'Tu primer objetivo' },
}

export interface OnbContext {
  hasDebt: boolean
  hasFund: boolean
  variable: boolean
  income: number
  committed: number
  biggestCredit?: OnbData['expenses'][number]
  balance: number
  motivPhrase: string
  motivNote: string
  coachName: string
}

function smallestExample(income: OnbData['income']): number {
  const ex = (income.examples || []).filter((x): x is number => typeof x === 'number' && !isNaN(x))
  return ex.length ? Math.min(...ex) : 0
}

export function buildContext(data: OnbData): OnbContext {
  const credits = data.expenses.filter((e) => e.isCredit)
  const variable = data.income.type === 'variable'
  const income = variable ? (data.income.floor || smallestExample(data.income)) : (data.income.amount || 0)
  const committed = data.expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const biggestCredit = credits.slice().sort((a, b) => (b.amount || 0) - (a.amount || 0))[0]
  const primaryChip = data.motivation.chips[0]
  return {
    hasDebt: credits.length > 0,
    hasFund: data.fund.has === true,
    variable,
    income,
    committed,
    biggestCredit,
    balance: data.balance || 0,
    motivPhrase: MOTIV_PHRASE[primaryChip] || 'tomar el control de tu plata',
    motivNote: (data.motivation.note || '').trim(),
    coachName: PERSONAS[data.coach ?? 'nilo']?.name || 'Tu coach',
  }
}

// derive case from the truth table (deuda × fondo)
export function deriveCaseId(ctx: OnbContext): CaseId {
  if (ctx.hasDebt && ctx.hasFund) return 'debt'        // pagar deuda, snowball
  if (ctx.hasDebt && !ctx.hasFund) return 'starter'    // colchón mínimo → snowball
  if (!ctx.hasDebt && !ctx.hasFund) return 'emergency' // fondo 3-6 (6-9 si variable)
  return 'investing'                                   // invertir / patrimonio
}

export function strategyFor(caseId: CaseId): Strategy {
  return caseId === 'debt' || caseId === 'starter' ? 'snowball' : null
}

const M = (n: number) => '$' + fmtCOP(Math.round(n))

interface Plan {
  phase: CaseId
  name: string
  strategyTag: string
  note: ReactNode
  because: ReactNode
  path: Array<{ t: string; s: string; now?: boolean }>
  firstStep: { t: string; s: string }
}

function buildPlan(caseId: CaseId, ctx: OnbContext): Plan {
  const debtName = ctx.biggestCredit ? ctx.biggestCredit.name.toLowerCase() : 'tu crédito'
  const oneMonth = ctx.committed || 1000000
  const firstApart = Math.max(50000, Math.round(((ctx.income || ctx.committed || 800000) * 0.1) / 1000) * 1000)
  const rate = ctx.biggestCredit?.rate

  const plans: Record<CaseId, Plan> = {
    starter: {
      phase: 'starter',
      name: 'Un colchón mínimo, y luego la deuda',
      strategyTag: 'Fondo de arranque → bola de nieve',
      note: <>Me dijiste que lo tuyo es <span className="hl">{ctx.motivPhrase}</span>. Empezamos justo por ahí — pero con un orden que te protege.</>,
      because: <>Tienes una deuda — <b>{debtName}</b>{rate ? <> al <span className="data">{rate}% mensual</span></> : ''} — pero <b>todavía no hay colchón</b>. Si hoy se daña algo, la única salida sería más deuda. Por eso, primero un respaldo mínimo de <span className="data">~1 mes ({M(oneMonth)})</span>; apenas esté, vamos con todo contra la deuda.</>,
      path: [
        { t: 'Junta un colchón de arranque', s: `~1 mes de tus gastos (${M(oneMonth)}). Tu red de seguridad mínima.`, now: true },
        { t: 'Ataca la deuda — bola de nieve', s: 'La más pequeña primero. Al inicio importa más sentir victorias que la matemática perfecta.' },
        { t: 'Completa tu fondo (3–6 meses)', s: 'Ya sin deuda encima, lo llevamos a su tamaño sano.' },
        { t: 'Empieza a construir', s: 'Inviertes y haces crecer tu plata.' },
      ],
      firstStep: { t: `Aparta ${M(firstApart)} esta quincena`, s: 'En una cuenta distinta a la del día a día. Es el primer ladrillo de tu colchón — pequeño a propósito, para que sí lo hagas.' },
    },
    debt: {
      phase: 'debt',
      name: 'A pagar esa deuda — con método',
      strategyTag: 'Bola de nieve (snowball)',
      note: <>Quieres <span className="hl">{ctx.motivPhrase}</span>, y ya tienes un colchón. Eso te da una base para atacar la deuda sin miedo.</>,
      because: <>Ya tienes un respaldo, así que no hay que frenarse: cada peso libre puede ir a <b>{debtName}</b>{rate ? <> (<span className="data">{rate}%/mes</span>)</> : ''}. Empezamos por la deuda <b>más pequeña</b> — no la más cara — porque al inicio no tienes historial de constancia, y las <b>victorias tempranas</b> son las que te mantienen.</>,
      path: [
        { t: 'Salda la deuda más pequeña', s: 'Pagos mínimos en todas, y todo lo extra a la más chica.', now: true },
        { t: 'Repite con la siguiente', s: 'Lo que pagabas en la primera ahora suma a la segunda. La bola crece.' },
        { t: 'Refuerza tu fondo a 3–6 meses', s: 'Sin deuda, tu colchón se vuelve tu prioridad.' },
        { t: 'Empieza a invertir', s: 'Tu plata empieza a trabajar para ti.' },
      ],
      firstStep: { t: 'Confirma cuál es tu deuda más pequeña', s: 'Esa es la que vamos a reventar primero. Te muestro el plan de cuánto y cuándo.' },
    },
    emergency: {
      phase: 'emergency',
      name: ctx.variable ? 'Tu fondo de tranquilidad (6–9 meses)' : 'Tu fondo de tranquilidad (3–6 meses)',
      strategyTag: ctx.variable ? 'Fondo de emergencia ampliado' : 'Fondo de emergencia',
      note: <>No tienes deudas — eso ya es enorme. Para <span className="hl">{ctx.motivPhrase}</span>, lo que sigue es dormir tranquilo pase lo que pase.</>,
      because: <>Estás libre de deudas, así que no hay que apagar incendios. Lo más sano ahora es un <b>fondo de emergencia</b>: {ctx.variable ? <>como tu ingreso <b>varía</b>, lo llevamos a <span className="data">6–9 meses</span> de gastos para que los meses flojos no te tumben.</> : <>de <span className="data">3 a 6 meses</span> de tus gastos.</>} Con eso firme, tu plata puede empezar a crecer.</>,
      path: [
        { t: ctx.variable ? 'Construye 6–9 meses de gastos' : 'Construye 3–6 meses de gastos', s: 'Tu red de seguridad. Aquí empieza la tranquilidad real.', now: true },
        { t: 'Automatiza el aporte', s: 'Una cuota fija cada vez que entra plata, antes de gastar.' },
        { t: 'Empieza a invertir', s: 'Con el respaldo listo, destinamos al menos 15% a hacer crecer tu plata.' },
        { t: 'Construye patrimonio', s: 'Diversificas y piensas en largo plazo.' },
      ],
      firstStep: { t: 'Define tu meta del fondo', s: 'Calculo el monto con tus gastos y cuánto apartar cada mes para llegar sin trauma.' },
    },
    investing: {
      phase: 'investing',
      name: 'Hora de hacer crecer tu plata',
      strategyTag: 'Inversión / construcción de patrimonio',
      note: <>Sin deudas y con colchón — vas <span className="hl">muy</span> por delante. Para <span className="hl">{ctx.motivPhrase}</span>, ahora tu plata trabaja para ti.</>,
      because: <>Tienes la casa en orden: <b>sin deudas</b> y con un <b>fondo</b> que te cubre. Eso es exactamente la base desde la que se construye patrimonio. El siguiente paso es destinar <span className="data">15% o más</span> de tu ingreso a inversión — de forma constante, no en arranques.</>,
      path: [
        { t: 'Destina 15%+ a inversión', s: 'Una cuota automática hacia activos, cada periodo.', now: true },
        { t: 'Diversifica', s: 'No todo en un solo lugar. Repartimos según tu horizonte.' },
        { t: 'Construye patrimonio', s: 'Real estate, negocio, largo plazo.' },
        { t: 'Revisa y ajusta', s: 'Cada cierre de mes miramos si vas según el plan.' },
      ],
      firstStep: { t: 'Define tu cuota de inversión', s: 'Calculo el 15% sobre tu ingreso y lo dejamos automático para que no dependa de tu memoria.' },
    },
  }
  return plans[caseId]
}

// ── deriving (loading) animation ─────────────────────────────────────────
function Deriving({ coach, onDone }: { coach: Persona; onDone: () => void }) {
  const rows = [
    'Leyendo lo que me contaste…',
    'Revisando tus gastos y deudas…',
    'Calculando tu fase y estrategia…',
    'Armando tu primer paso…',
  ]
  const [on, setOn] = useState(0)
  useEffect(() => {
    const timers = rows.map((_, i) => setTimeout(() => setOn(i + 1), 500 + i * 620))
    const fin = setTimeout(onDone, 500 + rows.length * 620 + 350)
    return () => { timers.forEach(clearTimeout); clearTimeout(fin) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="ob2-deriving">
      <Buddy persona={coach} emotion="think" size={104} />
      <div>
        <div className="d-title">Armando tu plan…</div>
        <div className="d-sub">No es una plantilla. Es tuyo, con tus números.</div>
      </div>
      <div className="d-steps">
        {rows.map((r, i) => (
          <div key={i} className={`d-row ${on > i ? 'on' : ''}`}>
            <span className="d-check"><Icon.Check size={12} /></span>{r}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ClosingScreen({
  data,
  onEnter,
  saving,
}: {
  data: OnbData
  onEnter: () => void
  saving?: boolean
}) {
  const [phase, setPhase] = useState<'deriving' | 'plan'>('deriving')
  const ctx = buildContext(data)
  const caseId = deriveCaseId(ctx)
  const coach = data.coach ?? 'nilo'
  const plan = buildPlan(caseId, ctx)
  const vis = PHASE_VIS[plan.phase]

  if (phase === 'deriving') {
    return (
      <div className="ob2-close">
        <Deriving coach={coach} onDone={() => setPhase('plan')} />
      </div>
    )
  }

  return (
    <div className="ob2-close" style={{ ['--phase' as string]: vis.color }}>
      <div className="ob2-close-scroll">
        <div className="ob2-close-hero">
          <span className="ob2-close-xp"><Icon.Check size={13} /> +50 XP · Plan creado</span>
          <div style={{ margin: '14px 0 2px' }}>
            <Buddy persona={coach} emotion="cheer" size={104} />
          </div>
          <div className="ob2-close-eyebrow">Tu coach</div>
          <div className="ob2-close-name">{ctx.coachName}</div>
        </div>

        <div className="ob2-note">
          <span className="quote-mark">“</span>{plan.note}<span className="quote-mark">”</span>
        </div>

        {ctx.motivNote && (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-mute)', fontStyle: 'italic', borderLeft: '2px solid var(--brand)', paddingLeft: 12, lineHeight: 1.5 }}>
            Tus palabras: “{ctx.motivNote}”
          </div>
        )}

        <div className="ob2-strat">
          <div className="ob2-strat-top">
            <div className="ob2-strat-badge">{(() => { const Ic = Icon[vis.icon]; return <Ic size={22} /> })()}</div>
            <div className="ob2-strat-head">
              <div className="ob2-strat-kicker">{vis.kicker}</div>
              <div className="ob2-strat-name">{plan.name}</div>
            </div>
          </div>
          <div className="ob2-strat-because">{plan.because}</div>
          <div className="ob2-path">
            {plan.path.map((p, i) => (
              <div key={i} className={`ob2-path-step ${p.now ? 'now' : ''}`}>
                <div className="ps-rail">
                  <div className="ps-dot">{p.now ? <Icon.Right size={13} /> : i + 1}</div>
                  <div className="ps-line" />
                </div>
                <div className="ps-body">
                  <div className="ps-t">{p.t}{p.now && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, marginLeft: 8, color: 'var(--phase)' }}>AHORA</span>}</div>
                  <div className="ps-s">{p.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ob2-first">
          <div className="fa-ic"><Icon.Flame size={19} /></div>
          <div className="fa-body">
            <div className="fa-kicker">Tu primer paso, hoy</div>
            <div className="fa-t">{plan.firstStep.t}</div>
            <div className="fa-s">{plan.firstStep.s}</div>
          </div>
        </div>
      </div>

      <div className="ob2-foot">
        <button className="ob2-cta" onClick={onEnter} disabled={saving}>
          {saving ? 'Guardando tu plan…' : <>Entrar a mi plan <Icon.Right size={16} /></>}
        </button>
      </div>
    </div>
  )
}
