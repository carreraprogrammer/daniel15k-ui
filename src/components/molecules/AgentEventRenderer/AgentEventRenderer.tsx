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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = event.payload as any;
  const { draft, warnings } = p as { draft: any; warnings?: string[] };

  // Normalize: agent may send nested or flat structure
  const baseIncome: number = draft.base_budget_income ?? draft.income?.base ?? 0;
  const obligationsTotal: number = draft.recurring_obligations_total ?? draft.obligations?.total_obligaciones ?? 0;
  const debtMinimums: number = draft.debt_minimums_total ?? draft.obligations?.deudas?.total ?? 0;
  const buffer: number = draft.protected_buffer_amount ?? 0;
  const freeMargin: number = draft.free_margin ?? draft.margen_libre ?? 0;
  const discretionary: number = draft.discretionary_limit ?? 0;

  const distribution: Record<string, number> = {};
  if (draft.distribution && !Array.isArray(draft.distribution)) {
    Object.assign(distribution, draft.distribution);
  } else {
    const arr: { categoria?: string; category?: string; monto?: number; amount?: number }[] =
      draft.distribucion ?? draft.distribution ?? [];
    for (const item of arr) {
      const key = item.categoria ?? item.category ?? '';
      distribution[key] = item.monto ?? item.amount ?? 0;
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardEyebrow}>Propuesta del agente</span>
        <h3 className={styles.cardTitle}>Plan {draft.month}/{draft.year}</h3>
      </div>

      <div className={styles.planGrid}>
        <div className={styles.planRow}>
          <span className={styles.planLabel}>Ingreso base</span>
          <strong className={styles.planValue}>{formatCop(baseIncome)}</strong>
        </div>
        <div className={`${styles.planRow} ${styles.planRowSubtract}`}>
          <span className={styles.planLabel}>Obligaciones fijas</span>
          <span className={styles.planValueMuted}>− {formatCop(obligationsTotal)}</span>
        </div>
        {debtMinimums > 0 && (
          <div className={`${styles.planRow} ${styles.planRowSubtract}`}>
            <span className={styles.planLabel}>Mínimos de deuda</span>
            <span className={styles.planValueMuted}>− {formatCop(debtMinimums)}</span>
          </div>
        )}
        {buffer > 0 && (
          <div className={`${styles.planRow} ${styles.planRowSubtract}`}>
            <span className={styles.planLabel}>Buffer de protección</span>
            <span className={styles.planValueMuted}>− {formatCop(buffer)}</span>
          </div>
        )}
        <div className={`${styles.planRow} ${styles.planRowResult}`}>
          <span className={styles.planLabel}>Margen libre</span>
          <strong className={styles.planValueAccent}>{formatCop(freeMargin)}</strong>
        </div>
        {discretionary > 0 && (
          <div className={styles.planRow}>
            <span className={styles.planLabel}>Límite discrecional</span>
            <strong className={styles.planValue}>{formatCop(discretionary)}</strong>
          </div>
        )}
      </div>

      {Object.keys(distribution).length > 0 && (
        <div className={styles.distribution}>
          <span className={styles.distributionTitle}>Distribución sugerida</span>
          {Object.entries(distribution).map(([category, amount]) => (
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
            <p key={i} className={styles.warningItem}>{w}</p>
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

  console.log('[AgentEventRenderer] status:', status, 'events:', events.length);

  if (status === 'idle') return null;

  return (
    <div className={styles.container}>
      {(status === 'loading' || status === 'active') && events.length === 0 && (
        <div className={styles.loadingCard}>
          <Spinner size="sm" />
          <span className={styles.loadingText}>El agente está analizando tu situación...</span>
        </div>
      )}
      {events.map(renderEvent)}
    </div>
  );
};
