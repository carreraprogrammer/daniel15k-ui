import { useAgentEvents } from '../../../hooks/useAgentEvents';
import type {
  AgentUiEvent,
  MonthlyPlanDraft,
  RequestConfirmationPayload,
  ShowCardPayload,
} from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import styles from './AgentEventRenderer.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

interface PlanProposalCardProps {
  draft: MonthlyPlanDraft;
  warnings?: string[];
  onConsume: () => void;
}

const PlanProposalCard = ({ draft, warnings, onConsume }: PlanProposalCardProps) => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <span className={styles.cardEyebrow}>Propuesta del agente</span>
      <h3 className={styles.cardTitle}>Plan {draft.month}/{draft.year}</h3>
    </div>

    <div className={styles.planGrid}>
      <div className={styles.planRow}>
        <span className={styles.planLabel}>Ingreso base</span>
        <strong className={styles.planValue}>{formatCop(draft.base_budget_income)}</strong>
      </div>
      <div className={`${styles.planRow} ${styles.planRowSubtract}`}>
        <span className={styles.planLabel}>Obligaciones fijas</span>
        <span className={styles.planValueMuted}>− {formatCop(draft.recurring_obligations_total)}</span>
      </div>
      <div className={`${styles.planRow} ${styles.planRowSubtract}`}>
        <span className={styles.planLabel}>Mínimos de deuda</span>
        <span className={styles.planValueMuted}>− {formatCop(draft.debt_minimums_total)}</span>
      </div>
      <div className={`${styles.planRow} ${styles.planRowSubtract}`}>
        <span className={styles.planLabel}>Buffer de protección</span>
        <span className={styles.planValueMuted}>− {formatCop(draft.protected_buffer_amount)}</span>
      </div>
      <div className={`${styles.planRow} ${styles.planRowResult}`}>
        <span className={styles.planLabel}>Margen libre</span>
        <strong className={styles.planValueAccent}>{formatCop(draft.free_margin)}</strong>
      </div>
      {draft.discretionary_limit > 0 && (
        <div className={styles.planRow}>
          <span className={styles.planLabel}>Límite discrecional</span>
          <strong className={styles.planValue}>{formatCop(draft.discretionary_limit)}</strong>
        </div>
      )}
    </div>

    {draft.distribution && Object.keys(draft.distribution).length > 0 && (
      <div className={styles.distribution}>
        <span className={styles.distributionTitle}>Distribución sugerida</span>
        {Object.entries(draft.distribution).map(([category, amount]) => (
          <div key={category} className={styles.distributionRow}>
            <span className={styles.distributionLabel}>{category}</span>
            <span className={styles.distributionAmount}>{formatCop(amount)}</span>
          </div>
        ))}
      </div>
    )}

    {warnings && warnings.length > 0 && (
      <div className={styles.warnings}>
        {warnings.map((w, i) => (
          <p key={i} className={styles.warningItem}>⚠ {w}</p>
        ))}
      </div>
    )}

    <div className={styles.cardActions}>
      <Button label="Revisar plan" onClick={onConsume} />
    </div>
  </div>
);

interface AgentCardProps {
  title: string;
  body: string;
  tone: ShowCardPayload['tone'];
  onConsume: () => void;
}

const AgentCard = ({ title, body, tone, onConsume }: AgentCardProps) => (
  <div className={`${styles.card} ${styles[`tone_${tone}`]}`}>
    <div className={styles.cardHeader}>
      <span className={styles.cardEyebrow}>Agente</span>
      <h3 className={styles.cardTitle}>{title}</h3>
    </div>
    <p className={styles.cardBody}>{body}</p>
    <div className={styles.cardActions}>
      <Button label="Entendido" variant="ghost" onClick={onConsume} />
    </div>
  </div>
);

interface ConfirmCardProps {
  question: string;
  context?: string;
  onConsume: () => void;
}

const ConfirmCard = ({ question, context, onConsume }: ConfirmCardProps) => (
  <div className={`${styles.card} ${styles.tone_info}`}>
    <div className={styles.cardHeader}>
      <span className={styles.cardEyebrow}>El agente necesita confirmación</span>
      <h3 className={styles.cardTitle}>{question}</h3>
    </div>
    {context && <p className={styles.cardBody}>{context}</p>}
    <div className={styles.cardActions}>
      <Button label="Confirmar" onClick={onConsume} />
    </div>
  </div>
);

const renderEvent = (event: AgentUiEvent, onConsume: () => void) => {
  switch (event.event_type) {
    case 'show_plan_proposal': {
      const p = event.payload as { draft: MonthlyPlanDraft; warnings?: string[] };
      return <PlanProposalCard key={event.id} draft={p.draft} warnings={p.warnings} onConsume={onConsume} />;
    }
    case 'show_card': {
      const p = event.payload as ShowCardPayload;
      return <AgentCard key={event.id} title={p.title} body={p.body} tone={p.tone} onConsume={onConsume} />;
    }
    case 'request_confirmation': {
      const p = event.payload as RequestConfirmationPayload;
      return <ConfirmCard key={event.id} question={p.question} context={p.context} onConsume={onConsume} />;
    }
    default:
      return null;
  }
};

type ReplyFn = (
  eventId: number,
  type: 'form_submitted' | 'confirmed' | 'dismissed',
  data?: Record<string, unknown>,
) => Promise<void>;

interface AgentEventRendererProps {
  sessionId?: string;
  onReply?: ReplyFn;
}

export const AgentEventRenderer = ({ sessionId, onReply }: AgentEventRendererProps) => {
  const { events, consume } = useAgentEvents(sessionId);

  if (!events.length) return null;

  const handleConsume = (event: AgentUiEvent, type: 'confirmed' | 'dismissed' = 'dismissed') => {
    if (onReply) {
      void onReply(event.id, type).then(() => consume(event.id));
    } else {
      void consume(event.id);
    }
  };

  return (
    <div className={styles.container}>
      {events.map((event) => renderEvent(event, () => handleConsume(event, 'confirmed')))}
    </div>
  );
};
