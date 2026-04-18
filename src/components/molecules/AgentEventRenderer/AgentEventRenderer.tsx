import { useAgentUI } from '../../../contexts/AgentUIContext';
import type {
  AgentUiEvent,
  MonthlyPlanDraft,
  RequestConfirmationPayload,
  ShowCardPayload,
} from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import styles from './AgentEventRenderer.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

// ─── PlanProposalCard ─────────────────────────────────────────────────────────

interface PlanProposalCardProps {
  event: AgentUiEvent;
}

const PlanProposalCard = ({ event }: PlanProposalCardProps) => {
  const { reply, consume } = useAgentUI();
  const p = event.payload as unknown as { draft: MonthlyPlanDraft; warnings?: string[] };
  const { draft, warnings } = p;

  return (
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
        <Button label="Descartar" variant="ghost" onClick={() => void consume(event.id)} />
        <Button label="Confirmar plan" onClick={() => void reply(event.id, 'confirmed')} />
      </div>
    </div>
  );
};

// ─── AgentCard ────────────────────────────────────────────────────────────────

const AgentCard = ({ event }: { event: AgentUiEvent }) => {
  const { consume } = useAgentUI();
  const p = event.payload as unknown as ShowCardPayload;

  return (
    <div className={`${styles.card} ${styles[`tone_${p.tone}`]}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardEyebrow}>Agente</span>
        <h3 className={styles.cardTitle}>{p.title}</h3>
      </div>
      <p className={styles.cardBody}>{p.body}</p>
      <div className={styles.cardActions}>
        <Button label="Entendido" variant="ghost" onClick={() => void consume(event.id)} />
      </div>
    </div>
  );
};

// ─── ConfirmCard ──────────────────────────────────────────────────────────────

const ConfirmCard = ({ event }: { event: AgentUiEvent }) => {
  const { reply } = useAgentUI();
  const p = event.payload as unknown as RequestConfirmationPayload;

  return (
    <div className={`${styles.card} ${styles.tone_info}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardEyebrow}>El agente necesita confirmación</span>
        <h3 className={styles.cardTitle}>{p.question}</h3>
      </div>
      {p.context && <p className={styles.cardBody}>{p.context}</p>}
      <div className={styles.cardActions}>
        <Button label="Cancelar" variant="ghost" onClick={() => void reply(event.id, 'dismissed')} />
        <Button label="Confirmar" onClick={() => void reply(event.id, 'confirmed')} />
      </div>
    </div>
  );
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const renderEvent = (event: AgentUiEvent) => {
  switch (event.event_type) {
    case 'show_plan_proposal': return <PlanProposalCard key={event.id} event={event} />;
    case 'show_card':          return <AgentCard key={event.id} event={event} />;
    case 'request_confirmation': return <ConfirmCard key={event.id} event={event} />;
    default: return null;
  }
};

// ─── AgentEventRenderer ───────────────────────────────────────────────────────

export const AgentEventRenderer = () => {
  const { state } = useAgentUI();
  const { events, status } = state;

  if (status === 'idle') return null;

  return (
    <div className={styles.container}>
      {status === 'loading' && events.length === 0 && (
        <div className={styles.loadingCard}>
          <Spinner size="sm" />
          <span className={styles.loadingText}>El agente está analizando tu situación...</span>
        </div>
      )}
      {events.map(renderEvent)}
    </div>
  );
};
