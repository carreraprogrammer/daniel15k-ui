import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Persona } from '../../../store/buddyStore'
import { Buddy } from '../../atoms/Buddy/Buddy'
import { Icon } from './OnboardingIcons'
import { startVoiceDictation } from '../../../services/voiceInput'
import type { VoiceSession } from '../../../services/voiceInput'
import { fmtCOP, parseMoney } from './helpers'
import type {
  ExpenseCategory,
  OnbExpense,
  ScreenProps,
} from './types'
import { ExpenseCapture } from './ExpenseCapture'

// ── shared bits ────────────────────────────────────────────────────────────
export function CoachBar({
  coach,
  emotion = 'calm',
  children,
}: {
  coach: Persona
  emotion?: 'calm' | 'happy' | 'think'
  children: ReactNode
}) {
  return (
    <div className="ob2-coachbar">
      <div className="av"><Buddy persona={coach} emotion={emotion} size={46} /></div>
      <div className="say">{children}</div>
    </div>
  )
}

// "why I'm asking" — context instead of pressure (no skipping data)
export function WhyAsk({ children }: { children: ReactNode }) {
  return (
    <details className="ob2-why">
      <summary><Icon.Coach size={14} /> ¿Por qué te lo pregunto?</summary>
      <div className="ob2-why-body">{children}</div>
    </details>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 0 · WELCOME + COACH PICK
// ════════════════════════════════════════════════════════════════════════
const COACH_ORDER: Persona[] = ['nilo', 'pip', 'teo']

const COACH_COPY: Record<Persona, { name: string; trait: string; line: string; color: string }> = {
  nilo: { name: 'Nilo', trait: 'el calmado', color: '#5FB58A', line: 'Va contigo despacio. Respira hondo y te baja las pulsaciones.' },
  pip: { name: 'Pip', trait: 'el juguetón', color: '#E6B656', line: 'Celebra cada paso. Rebota cuando algo te sale bien.' },
  teo: { name: 'Teo', trait: 'el analítico', color: '#7CA6E0', line: 'Te da los números claros. Mira, calcula y asiente.' },
}

export function WelcomeScreen({
  data,
  update,
  go,
}: Pick<ScreenProps, 'data' | 'update'> & { go: (step: number) => void }) {
  const picked = data.coach
  const set = (c: Persona) => update({ coach: c })
  return (
    <div className="ob2-welcome">
      <div className="w-hero">
        <div style={{ marginBottom: 6 }}>
          <Buddy persona={picked || 'pip'} emotion="happy" size={132} />
        </div>
        <div className="w-eyebrow">Bienvenida · ASCENT</div>
        <h1 className="w-title">Vamos a armar tu plan, juntos.</h1>
        <p className="w-body">
          No es una app que te regaña. Es alguien que mira tu plata contigo, sin juzgar, y te
          dice qué hacer distinto. Toma unos minutos — y vale la pena.
        </p>
        <div className="w-affirm"><Icon.Check size={14} /> Ya diste el paso difícil: estás aquí.</div>
      </div>

      <div className="ob2-pick-label">Elige quién te va a acompañar</div>
      <div className="ob2-pick">
        {COACH_ORDER.map((c) => {
          const p = COACH_COPY[c]
          return (
            <div
              key={c}
              className={`ob2-pick-card ${picked === c ? 'on' : ''}`}
              style={{ ['--pcc' as string]: p.color }}
              onClick={() => set(c)}
            >
              <div className="pc-av"><Buddy persona={c} emotion={picked === c ? 'happy' : 'calm'} size={54} /></div>
              <div className="pc-body">
                <div className="pc-name">{p.name} <span className="trait">{p.trait}</span></div>
                <div className="pc-line">{p.line}</div>
              </div>
              <div className="pc-check"><Icon.Check size={13} /></div>
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-mute)', marginTop: 12 }}>
        Puedes cambiarlo cuando quieras.
      </div>

      <div style={{ flex: 1, minHeight: 18 }} />
      <button className="ob2-cta" disabled={!picked} onClick={() => go(1)}>
        {picked ? `Empezar con ${COACH_COPY[picked].name}` : 'Elige un coach'}
        <Icon.Right size={16} />
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 1 · MOTIVACIÓN — el "para qué"
// ════════════════════════════════════════════════════════════════════════
const MOTIV_CHIPS: Array<{ id: string; label: string; icon: keyof typeof Icon }> = [
  { id: 'deuda', label: 'Salir de deudas', icon: 'Card' },
  { id: 'finmes', label: 'Llegar tranquilo a fin de mes', icon: 'Calendar' },
  { id: 'ahorro', label: 'Empezar a ahorrar', icon: 'Wallet' },
  { id: 'estres', label: 'Dejar de estresarme con la plata', icon: 'Heart' },
  { id: 'claridad', label: 'Entender en qué se me va', icon: 'Search' },
  { id: 'patrimonio', label: 'Construir algo a futuro', icon: 'Trend' },
]

export function MotivationScreen({ data, update, coach }: ScreenProps) {
  const sel = data.motivation.chips
  const toggle = (id: string) => {
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]
    update({ motivation: { ...data.motivation, chips: next } })
  }
  const setNote = (v: string) => update({ motivation: { ...data.motivation, note: v } })
  const [rec, setRec] = useState(false)
  const sessionRef = useRef<VoiceSession | null>(null)
  const toggleRec = async () => {
    if (rec) { await sessionRef.current?.stop(); return }
    setRec(true)
    sessionRef.current = await startVoiceDictation({
      onPartial: setNote,
      onFinal: (t) => { if (t) setNote(t); setRec(false) },
      onError: () => setRec(false),
    })
  }

  return (
    <div className="ob2-scroll">
      <CoachBar coach={coach} emotion="calm">
        Antes de cualquier número, lo más importante. <span className="soft">No hay respuesta correcta.</span>
      </CoachBar>
      <h2 className="ob2-q">¿Qué te gustaría que cambiara en tu relación con el dinero?</h2>
      <p className="ob2-sub">Elige lo que resuene. Puedes marcar varias.</p>

      <div className="ob2-chips">
        {MOTIV_CHIPS.map((c) => {
          const Ic = Icon[c.icon]
          return (
            <div key={c.id} className={`ob2-chip ${sel.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
              <span className="ic"><Ic size={15} /></span>{c.label}
            </div>
          )
        })}
      </div>

      <div className="ob2-deepen">
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', fontWeight: 600, marginBottom: 10 }}>
          ¿Quieres contarme con tus palabras? <span style={{ fontWeight: 400 }}>(opcional)</span>
        </div>
        <div className="ob2-deepen-row">
          <textarea
            value={data.motivation.note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Habla o escribe… ej: “quiero darle algo mejor a mis hijos”."
          />
          <button className={`ob2-mic ${rec ? 'rec' : ''}`} onClick={toggleRec} aria-label="Dictar">
            <Icon.Mic size={18} />
          </button>
        </div>
        {rec && (
          <div style={{ fontSize: 12.5, color: 'var(--committed)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--committed)' }} /> Escuchando…
          </div>
        )}
      </div>

      <WhyAsk>
        Esto es tu <b>norte</b>. Tu coach lo va a recordar y te lo va a devolver cuando flaquees —
        y guía todo el plan. <b>No es relleno:</b> sin un “para qué”, los números no significan nada.
      </WhyAsk>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 2 · SALDO HOY — punto de partida (confirmed_balance)
// ════════════════════════════════════════════════════════════════════════
export function BalanceScreen({ data, update, coach, error }: ScreenProps) {
  const set = (v: string) => update({ balance: parseMoney(v) })
  const quick = [200000, 500000, 1000000, 2000000]
  return (
    <div className="ob2-scroll">
      <CoachBar coach={coach} emotion="calm">
        Empecemos por hoy. <span className="soft">Sea mucho o poco, es solo el punto de partida.</span>
      </CoachBar>
      <h2 className="ob2-q">¿Con cuánto cuentas hoy para gastar?</h2>
      <p className="ob2-sub">Lo que tienes disponible ahora — en cuentas, efectivo, lo que ya es tuyo.</p>

      <div className="ob2-money">
        <span className="cur">$</span>
        <input
          inputMode="numeric"
          type="text"
          value={fmtCOP(data.balance)}
          onChange={(e) => set(e.target.value)}
          placeholder="0"
        />
      </div>
      {error && <div className="ob2-error"><Icon.Bell size={13} /> {error}</div>}
      <div className="ob2-quick">
        {quick.map((q) => <button key={q} onClick={() => update({ balance: q })}>${fmtCOP(q)}</button>)}
      </div>

      <WhyAsk>
        Es el <b>arranque</b> de tu plan del mes: desde aquí repartimos cada peso. No lo comparamos con
        nada ni con nadie — <b>tu punto de partida es tuyo.</b>
      </WhyAsk>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 3 · FONDO DE EMERGENCIA — colchón (deriva estrategia)
// ════════════════════════════════════════════════════════════════════════
export function FundScreen({ data, update, coach }: ScreenProps) {
  const f = data.fund
  const setHas = (v: boolean) => update({ fund: { ...f, has: v } })
  const setAmt = (v: string) => update({ fund: { ...f, amount: parseMoney(v) } })
  return (
    <div className="ob2-scroll">
      <CoachBar coach={coach} emotion="calm">
        A mucha gente esto le da pena. <span className="soft">No debería — la mayoría empieza sin colchón.</span>
      </CoachBar>
      <h2 className="ob2-q">¿Tienes un fondo para imprevistos?</h2>
      <p className="ob2-sub">Una platica aparte, para cuando algo se daña o sale de la nada.</p>

      <div className="ob2-binary">
        <div className={`ob2-bin ${f.has === true ? 'on' : ''}`} onClick={() => setHas(true)}>
          <div className="bin-ic"><Icon.Check size={18} /></div>
          <div className="bin-t">Sí, algo tengo</div>
          <div className="bin-s">Aunque sea poco, ya hay un colchón.</div>
        </div>
        <div className={`ob2-bin ${f.has === false ? 'on' : ''}`} onClick={() => setHas(false)}>
          <div className="bin-ic"><Icon.Close size={18} /></div>
          <div className="bin-t">Todavía no</div>
          <div className="bin-s">Es de lo primero que vamos a construir.</div>
        </div>
      </div>

      {f.has === true && (
        <div style={{ marginTop: 14, animation: 'fadeUp .35s both' }}>
          <div className="field-label">¿Cuánto tienes guardado, más o menos?</div>
          <div className="ob2-money sm">
            <span className="cur">$</span>
            <input inputMode="numeric" type="text" value={fmtCOP(f.amount)} onChange={(e) => setAmt(e.target.value)} placeholder="0" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8 }}>
            Un estimado está perfecto. Después lo afinamos.
          </div>
        </div>
      )}

      <WhyAsk>
        Tener o no tener colchón <b>cambia tu primer objetivo</b>. Con esto y tus gastos, tu coach decide
        si lo más sano hoy es <b>construir un respaldo</b> o <b>atacar una deuda</b> — y te lo explica.
      </WhyAsk>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 4 · GASTOS RECURRENTES — voz / foto / formulario + detección de crédito
// ════════════════════════════════════════════════════════════════════════
const CAT_COLORVARS: Record<ExpenseCategory, Record<string, string>> = {
  committed: { '--cat': 'var(--committed)', '--cat-soft': 'var(--committed-soft)' },
  necessary: { '--cat': 'var(--necessary)', '--cat-soft': 'var(--necessary-soft)' },
  discretionary: { '--cat': 'var(--discretionary)', '--cat-soft': 'var(--discretionary-soft)' },
  investment: { '--cat': 'var(--investment)', '--cat-soft': 'var(--investment-soft)' },
  social: { '--cat': 'var(--social)', '--cat-soft': 'var(--social-soft)' },
  income: { '--cat': 'var(--income)', '--cat-soft': 'var(--income-soft)' },
}
const CAT_LABEL: Record<ExpenseCategory, string> = {
  committed: 'Comprometido', necessary: 'Necesario', discretionary: 'Discrecional',
  investment: 'Inversión', social: 'Social', income: 'Ingreso',
}

function ExpenseItem({ it, onDel }: { it: OnbExpense; onDel: () => void }) {
  const Ic = Icon[(it.icon as keyof typeof Icon)] || Icon.Card
  return (
    <div className={`ob2-item ${it.isCredit ? 'is-credit' : ''}`} style={CAT_COLORVARS[it.cat]}>
      <div className="it-ic"><Ic size={18} /></div>
      <div className="it-body">
        <div className="it-name">{it.name}{it.isCredit && <span className="credit-tag">CRÉDITO</span>}</div>
        <div className="it-cat"><span className="dot" />{CAT_LABEL[it.cat]}{it.isCredit && it.rate ? ` · ${it.rate}% mes` : ''}</div>
      </div>
      <div className="it-amt">${fmtCOP(it.amount)}</div>
      <div className="it-del" onClick={onDel}><Icon.Close size={15} /></div>
    </div>
  )
}

// inline credit follow-up — coach asks naturally, not a form that pops open
function CreditFollowUp({
  it,
  coach,
  onResolve,
}: {
  it: OnbExpense
  coach: Persona
  onResolve: (patch: { rate: string | null; dueDay: number | null }) => void
}) {
  const [rate, setRate] = useState('')
  const [day, setDay] = useState<number | null>(it.dueDay || null)
  const rateChips = [2, 2.5, 3]
  return (
    <div className="ob2-credit">
      <div className="ob2-credit-say">
        <span className="av"><Buddy persona={coach} emotion="think" size={34} /></span>
        <span>Vi que <b>{it.name.toLowerCase()}</b> es un crédito. Para ayudarte a pagarlo más rápido,
          ¿me dices dos cositas? <span style={{ color: 'var(--text-mute)' }}>Si no las sabes de memoria, no pasa nada.</span></span>
      </div>
      <div className="ob2-credit-fields">
        <div className="ob2-credit-field">
          <div className="cf-label">Interés mensual <span className="cf-hint">— aprox, viene en tu extracto</span></div>
          <div className="ob2-mini-input">
            <input inputMode="decimal" value={rate === 'ns' ? '' : rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} placeholder="2.5" />
            <span className="unit">% / mes</span>
          </div>
          <div className="ob2-credit-quick" style={{ marginTop: 7 }}>
            {rateChips.map((r) => (
              <button key={r} className={String(rate) === String(r) ? 'on' : ''} onClick={() => setRate(String(r))}>{r}%</button>
            ))}
            <button className={rate === 'ns' ? 'on' : ''} onClick={() => setRate('ns')}>No lo sé</button>
          </div>
        </div>
        <div className="ob2-credit-field">
          <div className="cf-label">¿Qué día del mes lo pagas?</div>
          <div className="ob2-credit-quick">
            {[5, 10, 15, 20, 30].map((d) => (
              <button key={d} className={day === d ? 'on' : ''} onClick={() => setDay(d)}>Día {d}</button>
            ))}
          </div>
        </div>
        <button
          className="ob2-cta"
          style={{ marginTop: 4 }}
          disabled={!rate || !day}
          onClick={() => onResolve({ rate: rate === 'ns' ? null : rate, dueDay: day })}
        >
          Listo, sigamos <Icon.Check size={16} />
        </button>
        <div className="ob2-credit-skip" onClick={() => onResolve({ rate: null, dueDay: day || null })}>
          Lo averiguo después
        </div>
      </div>
    </div>
  )
}

export function ExpensesScreen({ data, update, coach }: ScreenProps) {
  const items = data.expenses
  const setItems = (next: OnbExpense[]) => update({ expenses: next })
  const delItem = (id: string) => setItems(items.filter((x) => x.id !== id))
  const resolveCredit = (id: string, patch: { rate: string | null; dueDay: number | null }) =>
    setItems(items.map((x) => (x.id === id ? { ...x, ...patch, resolved: true } : x)))

  const firstUnresolvedCredit = items.find((x) => x.isCredit && !x.resolved)
  const total = items.reduce((s, x) => s + (x.amount || 0), 0)

  return (
    <div className="ob2-scroll">
      <CoachBar coach={coach} emotion={items.length ? 'happy' : 'calm'}>
        Ahora lo que sale cada mes. <span className="soft">Lo más fácil: dímelos de corrido, yo los organizo.</span>
      </CoachBar>
      <h2 className="ob2-q">¿Qué gastos sabes que te salen cada mes?</h2>

      <ExpenseCapture coach={coach} hasItems={items.length > 0} onParsed={(parsed) => setItems([...items, ...parsed])} />

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '12px 2px 8px' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-mute)', fontWeight: 600 }}>{items.length} gastos · revísalos</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--text-soft)' }}>${fmtCOP(total)}/mes</span>
          </div>
          <div className="ob2-list">
            {items.map((it) => <ExpenseItem key={it.id} it={it} onDel={() => delItem(it.id)} />)}
          </div>

          {firstUnresolvedCredit && (
            <CreditFollowUp
              it={firstUnresolvedCredit}
              coach={coach}
              onResolve={(patch) => resolveCredit(firstUnresolvedCredit.id, patch)}
            />
          )}

          <div
            className="ob2-add"
            onClick={() => setItems([...items, { id: 'e' + Date.now(), name: 'Nuevo gasto', amount: 100000, cat: 'necessary', icon: 'Cart' }])}
          >
            <span className="add-ic"><Icon.Plus size={18} /></span> Agregar otro
          </div>
        </>
      )}

      <WhyAsk>
        Es tu <b>carga fija del mes</b>: lo que ya está comprometido antes de decidir nada. Y si alguno
        es una <b>cuota o tarjeta</b>, lo detecto y te pregunto un par de cosas — así sale tu deuda
        sin un interrogatorio aparte.
      </WhyAsk>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 5 · INGRESOS — fijo vs variable (piso confiable + ejemplos)
// ════════════════════════════════════════════════════════════════════════
const CADENCES: Array<{ id: NonNullable<ScreenProps['data']['income']['cadence']>; label: string }> = [
  { id: 'mensual', label: 'Mensual' },
  { id: 'quincenal', label: 'Quincenal' },
  { id: 'semanal', label: 'Semanal' },
  { id: 'irregular', label: 'Cuando hay trabajo' },
]

export function IncomeScreen({ data, update, coach }: ScreenProps) {
  const inc = data.income
  const setType = (v: 'fixed' | 'variable') => update({ income: { ...inc, type: v } })
  const setAmt = (v: string) => update({ income: { ...inc, amount: parseMoney(v) } })
  const setFloor = (v: string) => update({ income: { ...inc, floor: parseMoney(v) } })
  const setCad = (v: NonNullable<typeof inc.cadence>) => update({ income: { ...inc, cadence: v } })
  const setEx = (i: number, v: string) => {
    const ex: Array<number | ''> = inc.examples.length ? [...inc.examples] : ['', '', '']
    ex[i] = parseMoney(v) ?? ''
    update({ income: { ...inc, examples: ex } })
  }
  const [showEx, setShowEx] = useState(false)
  const months = ['Mes pasado', 'Hace 2 meses', 'Hace 3 meses']

  return (
    <div className="ob2-scroll">
      <CoachBar coach={coach} emotion="calm">
        Y lo que entra. <span className="soft">A mucha gente le cambia mes a mes — eso es normal, lo manejamos.</span>
      </CoachBar>
      <h2 className="ob2-q">¿Cómo te entra la plata?</h2>
      <p className="ob2-sub">Elige lo que más se parezca a tu realidad.</p>

      <div className="ob2-binary">
        <div className={`ob2-bin ${inc.type === 'fixed' ? 'on' : ''}`} onClick={() => setType('fixed')}>
          <div className="bin-ic"><Icon.Calendar size={18} /></div>
          <div className="bin-t">Más o menos fijo</div>
          <div className="bin-s">Un sueldo parecido cada periodo.</div>
        </div>
        <div className={`ob2-bin ${inc.type === 'variable' ? 'on' : ''}`} onClick={() => setType('variable')}>
          <div className="bin-ic"><Icon.Flow size={18} /></div>
          <div className="bin-t">Cambia mes a mes</div>
          <div className="bin-s">Freelance, comisiones, negocio propio.</div>
        </div>
      </div>

      {inc.type === 'fixed' && (
        <div style={{ marginTop: 14, animation: 'fadeUp .35s both' }}>
          <div className="field-label">¿Cuánto entra cada vez?</div>
          <div className="ob2-money sm">
            <span className="cur">$</span>
            <input inputMode="numeric" value={fmtCOP(inc.amount)} onChange={(e) => setAmt(e.target.value)} placeholder="0" />
          </div>
          <div className="field-label" style={{ marginTop: 16 }}>¿Cada cuánto?</div>
          <div className="ob2-cadence">
            {CADENCES.slice(0, 3).map((c) => (
              <div key={c.id} className={`ob2-cad ${inc.cadence === c.id ? 'on' : ''}`} onClick={() => setCad(c.id)}>{c.label}</div>
            ))}
          </div>
        </div>
      )}

      {inc.type === 'variable' && (
        <div style={{ marginTop: 14, animation: 'fadeUp .35s both' }}>
          <div className="ob2-floor">
            <div className="ob2-floor-head">
              <div className="f-ic"><Icon.Target size={18} /></div>
              <div>
                <div className="f-t">Tu piso confiable</div>
                <div className="f-s">No el mejor mes ni el promedio. En un mes <b>flojo</b>, ¿con cuánto sabes que cuentas casi seguro?</div>
              </div>
            </div>
            <div className="ob2-money sm">
              <span className="cur">$</span>
              <input inputMode="numeric" value={fmtCOP(inc.floor)} onChange={(e) => setFloor(e.target.value)} placeholder="0" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8 }}>
              Planeamos sobre esto. Lo que entre de más, es viento a favor.
            </div>

            {!showEx && (
              <div className="ob2-ex-toggle" onClick={() => setShowEx(true)}>
                <Icon.Plus size={13} /> No estoy seguro — ayúdame con ejemplos
              </div>
            )}
            {showEx && (
              <div className="ob2-examples">
                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 2 }}>¿Cuánto entró en estos meses?</div>
                {months.map((m, i) => (
                  <div className="ob2-ex-row" key={i}>
                    <span className="ex-m">{m}</span>
                    <div className="ex-input"><span style={{ color: 'var(--text-mute)', fontFamily: 'var(--f-mono)' }}>$</span>
                      <input inputMode="numeric" value={fmtCOP(inc.examples[i] ?? '')} onChange={(e) => setEx(i, e.target.value)} placeholder="0" />
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
                  Tomo el más bajo como tu piso — así el plan nunca te queda grande.
                </div>
              </div>
            )}
          </div>
          <div className="field-label" style={{ marginTop: 16 }}>¿Cada cuánto suele entrar?</div>
          <div className="ob2-cadence">
            {CADENCES.map((c) => (
              <div key={c.id} className={`ob2-cad ${inc.cadence === c.id ? 'on' : ''}`} onClick={() => setCad(c.id)}>{c.label}</div>
            ))}
          </div>
        </div>
      )}

      <WhyAsk>
        Con esto cierro el plan: cada peso que entra recibe un trabajo. Si tu ingreso varía, planeo sobre
        tu <b>piso</b> — nunca sobre un mes bueno — para que el plan <b>aguante los meses flojos.</b>
      </WhyAsk>
    </div>
  )
}

export { CAT_COLORVARS, CAT_LABEL }
