import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAgentUI } from '../../../contexts/AgentUIContext'
import { Buddy } from '../../atoms/Buddy'
import { useBuddyStore } from '../../../store/buddyStore'
import { formatCurrencyCompact } from '../../../utils/formatCurrency'
import { financeService } from '../../../services/financeService'
import type {
  AgentUiEvent,
  RequestConfirmationPayload,
  ShowAmountEditorPayload,
  ShowCardPayload,
  ShowCategorySelectorPayload,
  ShowQuickRepliesPayload,
} from '../../../types/finance.types'
import styles from './ChatPage.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatEntry =
  | { kind: 'user'; text: string; id: string }
  | { kind: 'assistant-text'; text: string; id: string }
  | { kind: 'event'; event: AgentUiEvent; id: string }

// ─── Markdown ─────────────────────────────────────────────────────────────────

const renderMarkdown = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── Inline event cards ────────────────────────────────────────────────────────

const InlineCard = ({ event }: { event: AgentUiEvent }) => {
  const { reply, consume } = useAgentUI()

  switch (event.event_type) {

    case 'show_card': {
      const p = event.payload as unknown as ShowCardPayload
      return (
        <div className={styles.card}>
          {p.title && <p className={styles.cardTitle}>{p.title}</p>}
          <p className={styles.cardBody}>{renderMarkdown(p.body)}</p>
        </div>
      )
    }

    case 'show_quick_replies': {
      const p = event.payload as unknown as ShowQuickRepliesPayload
      return (
        <div className={styles.card}>
          {p.title && <p className={styles.cardTitle}>{p.title}</p>}
          <p className={styles.cardBody}>{renderMarkdown(p.body)}</p>
          <div className={styles.cardActions}>
            {p.buttons.map((button) => (
              <button
                key={button.callback_data}
                className={styles.cardBtn}
                onClick={() => void reply(event.id, 'callback', { callback_data: button.callback_data })}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      )
    }

    case 'request_confirmation': {
      const p = event.payload as unknown as RequestConfirmationPayload
      return (
        <div className={styles.card}>
          <p className={styles.cardBody}>{p.question}</p>
          {p.context && <p className={styles.cardContext}>{p.context}</p>}
          <div className={styles.cardActions}>
            <button className={styles.cardBtnGhost} onClick={() => void reply(event.id, 'dismissed')}>
              No
            </button>
            <button className={styles.cardBtn} onClick={() => void reply(event.id, 'confirmed')}>
              Confirmar
            </button>
          </div>
        </div>
      )
    }

    case 'show_plan_proposal': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = event.payload as any
      const draft = p.draft ?? p
      const income: number = draft.base_budget_income ?? draft.income?.base ?? 0
      const obligations: number = draft.recurring_obligations_total ?? draft.obligations?.total ?? 0
      const freeMargin: number = draft.free_margin ?? draft.margen_libre ?? 0
      return (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Propuesta de plan mensual</p>
          <div className={styles.planSummary}>
            <div className={styles.planRow}>
              <span>Ingreso base</span>
              <strong>{formatCurrencyCompact(income)}</strong>
            </div>
            <div className={styles.planRow}>
              <span>Obligaciones</span>
              <span className={styles.planMinus}>− {formatCurrencyCompact(obligations)}</span>
            </div>
            <div className={`${styles.planRow} ${styles.planTotal}`}>
              <span>Margen libre</span>
              <strong className={freeMargin >= 0 ? styles.planPositive : styles.planNegative}>
                {formatCurrencyCompact(freeMargin)}
              </strong>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.cardBtnGhost} onClick={() => void consume(event.id)}>
              Descartar
            </button>
            <button className={styles.cardBtn} onClick={() => void reply(event.id, 'confirmed')}>
              Confirmar plan
            </button>
          </div>
        </div>
      )
    }

    case 'show_category_selector': {
      const p = event.payload as unknown as ShowCategorySelectorPayload
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [selected, setSelected] = useState<Set<string>>(
        () => new Set(p.categories.filter((c) => c.selected).map((c) => c.code))
      )
      const toggle = (code: string) =>
        setSelected((prev) => {
          const next = new Set(prev)
          next.has(code) ? next.delete(code) : next.add(code)
          return next
        })
      return (
        <div className={styles.card}>
          <p className={styles.cardTitle}>{p.title}</p>
          {p.subtitle && <p className={styles.cardContext}>{p.subtitle}</p>}
          <div className={styles.categoryList}>
            {p.categories.map((cat) => (
              <label key={cat.code} className={styles.categoryItem}>
                <input
                  type="checkbox"
                  checked={selected.has(cat.code)}
                  onChange={() => toggle(cat.code)}
                  className={styles.categoryCheck}
                />
                <span>{cat.name}</span>
              </label>
            ))}
          </div>
          <button
            className={styles.cardBtn}
            onClick={() => void reply(event.id, 'categories_selected', {
              selected_categories: Array.from(selected),
            })}
          >
            Confirmar ({selected.size})
          </button>
        </div>
      )
    }

    case 'show_amount_editor': {
      const p = event.payload as unknown as ShowAmountEditorPayload
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [amounts, setAmounts] = useState<Record<string, number>>(
        () => Object.fromEntries(p.items.map((i) => [i.code, i.amount]))
      )
      const setAmt = (code: string, val: string) => {
        const n = parseInt(val.replace(/\D/g, ''), 10)
        setAmounts((prev) => ({ ...prev, [code]: isNaN(n) ? 0 : n }))
      }
      const total = Object.values(amounts).reduce((a, b) => a + b, 0)
      return (
        <div className={styles.card}>
          <p className={styles.cardTitle}>{p.title}</p>
          {p.subtitle && <p className={styles.cardContext}>{p.subtitle}</p>}
          <div className={styles.amountList}>
            {p.items.map((item) => (
              <div key={item.code} className={styles.amountRow}>
                <span className={styles.amountLabel}>{item.name}</span>
                {item.editable ? (
                  <input
                    type="text"
                    className={styles.amountInput}
                    value={amounts[item.code] ? formatCurrencyCompact(amounts[item.code]) : ''}
                    onChange={(e) => setAmt(item.code, e.target.value)}
                    placeholder="$0"
                  />
                ) : (
                  <span className={styles.amountFixed}>{formatCurrencyCompact(item.amount)}</span>
                )}
              </div>
            ))}
            <div className={`${styles.amountRow} ${styles.amountTotal}`}>
              <span>Total</span>
              <strong>{formatCurrencyCompact(total)}</strong>
            </div>
          </div>
          <button
            className={styles.cardBtn}
            onClick={() => void reply(event.id, 'amounts_confirmed', { amounts })}
          >
            Confirmar montos
          </button>
        </div>
      )
    }

    default:
      return null
  }
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

const TypingDots = () => (
  <div className={styles.typing}>
    <span className={styles.dot} />
    <span className={styles.dot} />
    <span className={styles.dot} />
  </div>
)

// ─── ChatPage ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export const ChatPage = ({ onClose }: Props) => {
  const { state, startChat } = useAgentUI()
  const persona = useBuddyStore((s) => s.persona)

  const [history, setHistory] = useState<ChatEntry[]>([])
  const [input, setInput] = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const seenEventIds = useRef(new Set<number>())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Hydrate from DB on first open
  useEffect(() => {
    // Snapshot existing event IDs at mount time — these are already reflected in DB history
    const existingEventIds = new Set(state.events.map((e) => e.id))

    financeService.fetchChatHistory(30).then((msgs) => {
      // Pre-seed seenEventIds so events already in context don't duplicate DB history entries
      for (const id of existingEventIds) {
        seenEventIds.current.add(id)
      }
      const entries: ChatEntry[] = msgs.map((m, i) => ({
        kind: m.role === 'user' ? 'user' : 'assistant-text',
        text: m.content,
        id: `hist-${i}`,
      } as ChatEntry))
      setHistory(entries)
    }).catch(() => {
      // History load failed — start fresh, no blocker
    }).finally(() => {
      setHistoryLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Capture incoming events into local history
  useEffect(() => {
    if (!historyLoaded) return
    const newEntries: ChatEntry[] = []
    for (const event of state.events) {
      if (!seenEventIds.current.has(event.id)) {
        seenEventIds.current.add(event.id)
        newEntries.push({ kind: 'event', event, id: String(event.id) })
      }
    }
    if (newEntries.length > 0) {
      setHistory((prev) => [...prev, ...newEntries])
    }
  }, [state.events, historyLoaded])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, state.status])

  // Auto-grow textarea
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }, [input])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || state.status === 'loading') return
    setInput('')
    setHistory((prev) => [...prev, { kind: 'user', text, id: `u-${Date.now()}` }])
    await startChat(text)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const isLoading = state.status === 'loading'

  const SUG_CHIPS = ['¿Cómo voy este mes?', 'Cierra mi mes', '¿Cuánto puedo abonar?', 'Crea una meta']

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" data-app-overlay="chat">
      {/* Grain */}
      <div className={styles.grain} aria-hidden="true" />

      {/* Ambient glow */}
      <div className={styles.ambientTop} aria-hidden="true" />
      <div className={styles.ambientBottom} aria-hidden="true" />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerAvatar}>
          <Buddy persona={persona} emotion={isLoading ? 'think' : 'calm'} size={34} />
        </div>
        <div className={styles.headerMeta}>
          <p className={styles.headerName}>Nilo</p>
          <p className={styles.headerSub}>
            <span className={styles.liveDot} aria-hidden="true" />
            {isLoading ? 'escribiendo…' : 'tu asistente · finanzas'}
          </p>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className={styles.messages}>
        {history.length === 0 && !isLoading && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Cuéntame en qué puedo ayudarte hoy.
            </p>
          </div>
        )}

        {history.map((entry) => (
          <div key={entry.id} className={styles.messageRow}>
            {entry.kind === 'user' ? (
              <div className={styles.userBubble}>
                <p className={styles.userText}>{entry.text}</p>
              </div>
            ) : entry.kind === 'assistant-text' ? (
              <div className={styles.agentRow}>
                <div className={styles.agentContent}>
                  <div className={styles.card}>
                    <p className={styles.cardBody}>{renderMarkdown(entry.text)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.agentRow}>
                <div className={styles.agentContent}>
                  <InlineCard event={entry.event} />
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className={styles.agentRow}>
            <TypingDots />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      <div className={styles.chips}>
        {SUG_CHIPS.map((q) => (
          <button
            key={q}
            className={styles.chip}
            onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className={styles.inputBar}>
        <div className={styles.inputWrap}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe un mensaje…"
            rows={1}
            disabled={isLoading}
          />
          <button
            className={`${styles.sendBtn}${input.trim() ? ` ${styles.sendBtnReady}` : ''}`}
            onClick={() => void send()}
            disabled={!input.trim() || isLoading}
            aria-label="Enviar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Portal wrapper ────────────────────────────────────────────────────────────

export const ChatPortal = (props: Props) =>
  createPortal(<ChatPage {...props} />, document.body)
