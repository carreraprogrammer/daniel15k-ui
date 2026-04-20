import { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useAgentUI } from '../../../contexts/AgentUIContext';
import type {
  AgentUiEvent,
  AgentUiEventType,
  AmountEditorItem,
  BudgetCategoryOption,
  RequestConfirmationPayload,
  ShowAmountEditorPayload,
  ShowCardPayload,
  ShowCategorySelectorPayload,
} from '../../../types/finance.types';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import styles from './AgentEventRenderer.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const renderMarkdown = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  // eslint-disable-next-line react/no-danger
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// ─── Step map ─────────────────────────────────────────────────────────────────

const STEPS: { type: AgentUiEventType | '__loading__'; label: string }[] = [
  { type: '__loading__',          label: 'Analizando' },
  { type: 'show_card',            label: 'Ingreso' },
  { type: 'show_category_selector', label: 'Categorías' },
  { type: 'show_amount_editor',   label: 'Montos' },
  { type: 'show_plan_proposal',   label: 'Propuesta' },
  { type: 'request_confirmation', label: 'Confirmar' },
];

const stepIndexFor = (event: AgentUiEvent | null, isLoading: boolean) => {
  if (!event) return isLoading ? 0 : -1;
  const idx = STEPS.findIndex((s) => s.type === event.event_type);
  return idx >= 0 ? idx : 4; // default to plan step
};

// ─── StepBar ─────────────────────────────────────────────────────────────────

const StepBar = ({ event, isLoading }: { event: AgentUiEvent | null; isLoading: boolean }) => {
  const current = stepIndexFor(event, isLoading);
  return (
    <div className={styles.stepBar}>
      {STEPS.map((step, i) => (
        <div
          key={step.type}
          className={[
            styles.stepItem,
            i < current ? styles.stepDone : '',
            i === current ? styles.stepActive : '',
          ].filter(Boolean).join(' ')}
        >
          <div className={styles.stepDot} />
          <span className={styles.stepLabel}>{step.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Loading state ────────────────────────────────────────────────────────────

const LoadingState = () => (
  <div className={styles.loadingState}>
    <Spinner size="lg" />
    <p className={styles.loadingTitle}>Analizando tu situación financiera</p>
    <p className={styles.loadingSubtitle}>El agente está revisando ingresos, obligaciones y deudas...</p>
  </div>
);

// ─── PlanProposalCard ─────────────────────────────────────────────────────────

const PlanProposalCard = ({ event }: { event: AgentUiEvent }) => {
  const { reply, consume } = useAgentUI();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = event.payload as any;
  const { draft, warnings } = p as { draft: any; warnings?: string[] };

  // Normalize: agent may send nested or flat structure
  const baseIncome: number =
    draft.base_budget_income ?? draft.income?.base ?? draft.income?.fixed_total ?? 0;
  const obligationsTotal: number =
    draft.recurring_obligations_total ??
    draft.obligations?.total ??
    draft.obligations?.total_obligaciones ??
    0;
  const debtMinimums: number =
    draft.debt_minimums_total ??
    draft.debt_minimums?.total ??
    draft.obligations?.deudas?.total ??
    0;
  const sinkingFunds: number = draft.sinking_funds_total ?? 0;
  const buffer: number = draft.protected_buffer_amount ?? 0;
  const freeMargin: number = draft.free_margin ?? draft.margen_libre ?? 0;
  const marginStatus: 'surplus' | 'deficit' | 'balanced' =
    freeMargin > 5000 ? 'surplus' : freeMargin < -5000 ? 'deficit' : 'balanced';

  const distribution: { key: string; amount: number }[] = [];
  if (draft.distribution && !Array.isArray(draft.distribution)) {
    for (const [k, v] of Object.entries(draft.distribution as Record<string, number>)) {
      distribution.push({ key: k, amount: v });
    }
  } else {
    const arr: { categoria?: string; category?: string; monto?: number; amount?: number }[] =
      draft.distribucion ?? draft.distribution ?? [];
    for (const item of arr) {
      distribution.push({
        key: item.categoria ?? item.category ?? '',
        amount: item.monto ?? item.amount ?? 0,
      });
    }
  }

  return (
    <div className={styles.proposalContent}>
      <div className={styles.proposalSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ingreso base</span>
          <strong className={styles.summaryValue}>{formatCop(baseIncome)}</strong>
        </div>
        <div className={`${styles.summaryItem} ${styles.summarySubtract}`}>
          <span className={styles.summaryLabel}>Obligaciones fijas</span>
          <span className={styles.summaryValueMuted}>− {formatCop(obligationsTotal)}</span>
        </div>
        {debtMinimums > 0 && (
          <div className={`${styles.summaryItem} ${styles.summarySubtract}`}>
            <span className={styles.summaryLabel}>Mínimos de deuda</span>
            <span className={styles.summaryValueMuted}>− {formatCop(debtMinimums)}</span>
          </div>
        )}
        {sinkingFunds > 0 && (
          <div className={`${styles.summaryItem} ${styles.summarySubtract}`}>
            <span className={styles.summaryLabel}>Bolsillos (sinking funds)</span>
            <span className={styles.summaryValueMuted}>− {formatCop(sinkingFunds)}</span>
          </div>
        )}
        {buffer > 0 && (
          <div className={`${styles.summaryItem} ${styles.summarySubtract}`}>
            <span className={styles.summaryLabel}>Buffer de protección</span>
            <span className={styles.summaryValueMuted}>− {formatCop(buffer)}</span>
          </div>
        )}
        <div
          className={[
            styles.summaryItem,
            styles.summaryResult,
            marginStatus === 'surplus' ? styles.marginSurplus : '',
            marginStatus === 'deficit' ? styles.marginDeficit : '',
          ].filter(Boolean).join(' ')}
        >
          <span className={styles.summaryLabel}>Margen libre</span>
          <strong className={styles.summaryValueAccent}>{formatCop(freeMargin)}</strong>
        </div>
      </div>

      {distribution.length > 0 && (
        <div className={styles.distributionSection}>
          <p className={styles.sectionLabel}>Distribución sugerida</p>
          <div className={styles.distributionGrid}>
            {distribution.map(({ key, amount }) => (
              <div key={key} className={styles.distributionItem}>
                <span className={styles.distributionLabel}>{key}</span>
                <span className={styles.distributionAmount}>{formatCop(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className={styles.warningsList}>
          {warnings.map((w, i) => (
            <div key={i} className={styles.warningItem}>
              <span className={styles.warningIcon}>⚠️</span>
              <p className={styles.warningText}>{w}</p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.modalActions}>
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
    <div className={`${styles.infoContent} ${styles[`tone_${p.tone}`]}`}>
      <p className={styles.infoBody}>{renderMarkdown(p.body)}</p>
      <div className={styles.modalActions}>
        <Button label="Entendido" onClick={() => void consume(event.id)} />
      </div>
    </div>
  );
};

// ─── ConfirmCard ──────────────────────────────────────────────────────────────

const ConfirmCard = ({ event }: { event: AgentUiEvent }) => {
  const { reply } = useAgentUI();
  const p = event.payload as unknown as RequestConfirmationPayload;

  return (
    <div className={styles.infoContent}>
      <p className={styles.infoBody}>{p.question}</p>
      {p.context && <p className={styles.infoContext}>{p.context}</p>}
      <div className={styles.modalActions}>
        <Button label="Cancelar" variant="ghost" onClick={() => void reply(event.id, 'dismissed')} />
        <Button label="Confirmar" onClick={() => void reply(event.id, 'confirmed')} />
      </div>
    </div>
  );
};

// ─── CategorySelectorCard ─────────────────────────────────────────────────────

const CategorySelectorCard = ({ event }: { event: AgentUiEvent }) => {
  const { reply } = useAgentUI();
  const p = event.payload as unknown as ShowCategorySelectorPayload;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(p.categories.filter((c) => c.selected).map((c) => c.code))
  );

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const confirm = () =>
    void reply(event.id, 'categories_selected', { selected_categories: Array.from(selected) });

  const byType: Record<string, BudgetCategoryOption[]> = {};
  for (const cat of p.categories) {
    (byType[cat.category_type] ??= []).push(cat);
  }

  const typeLabel: Record<string, string> = {
    committed:    'Comprometidos',
    necessary:    'Necesarios',
    discretionary:'Discrecionales',
    investment:   'Inversión',
  };

  return (
    <div className={styles.selectorContent}>
      {p.subtitle && <p className={styles.selectorSubtitle}>{p.subtitle}</p>}
      <div className={styles.categoryList}>
        {Object.entries(byType).map(([type, cats]) => (
          <div key={type} className={styles.categoryGroup}>
            <span className={styles.categoryGroupLabel}>{typeLabel[type] ?? type}</span>
            {cats.map((cat) => (
              <label key={cat.code} className={styles.categoryItem}>
                <input
                  type="checkbox"
                  className={styles.categoryCheckbox}
                  checked={selected.has(cat.code)}
                  onChange={() => toggle(cat.code)}
                />
                <span className={styles.categoryName}>{cat.name}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.modalActions}>
        <span className={styles.selectionCount}>{selected.size} seleccionadas</span>
        <Button label="Continuar" onClick={confirm} />
      </div>
    </div>
  );
};

// ─── AmountEditorCard ─────────────────────────────────────────────────────────

const AmountEditorCard = ({ event }: { event: AgentUiEvent }) => {
  const { reply } = useAgentUI();
  const p = event.payload as unknown as ShowAmountEditorPayload;
  const [amounts, setAmounts] = useState<Record<string, number>>(
    () => Object.fromEntries(p.items.map((i) => [i.code, i.amount]))
  );

  const setAmount = (code: string, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    setAmounts((prev) => ({ ...prev, [code]: isNaN(num) ? 0 : num }));
  };

  const total = Object.values(amounts).reduce((a, b) => a + b, 0);
  const confirm = () => void reply(event.id, 'amounts_confirmed', { amounts });

  return (
    <div className={styles.editorContent}>
      {p.subtitle && <p className={styles.selectorSubtitle}>{p.subtitle}</p>}
      <div className={styles.amountList}>
        {p.items.map((item: AmountEditorItem) => (
          <div key={item.code} className={styles.amountRow}>
            <span className={styles.amountLabel}>{item.name}</span>
            {item.editable ? (
              <input
                type="text"
                className={styles.amountInput}
                value={amounts[item.code] ? formatCop(amounts[item.code]) : ''}
                onChange={(e) => setAmount(item.code, e.target.value)}
                placeholder="$0"
              />
            ) : (
              <span className={styles.amountFixed}>{formatCop(item.amount)}</span>
            )}
          </div>
        ))}
      </div>
      <div className={styles.amountTotalRow}>
        <span className={styles.summaryLabel}>Total asignado</span>
        <strong className={styles.summaryValueAccent}>{formatCop(total)}</strong>
      </div>
      <div className={styles.modalActions}>
        <Button label="Confirmar montos" onClick={confirm} />
      </div>
    </div>
  );
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const renderEventContent = (event: AgentUiEvent) => {
  switch (event.event_type) {
    case 'show_plan_proposal':    return <PlanProposalCard event={event} />;
    case 'show_card':             return <AgentCard event={event} />;
    case 'request_confirmation':  return <ConfirmCard event={event} />;
    case 'show_category_selector':return <CategorySelectorCard event={event} />;
    case 'show_amount_editor':    return <AmountEditorCard event={event} />;
    default:                      return null;
  }
};

const titleFor = (event: AgentUiEvent | null, isLoading: boolean): string => {
  if (!event && isLoading) return 'Analizando...';
  if (!event) return 'Asistente financiero';
  switch (event.event_type) {
    case 'show_plan_proposal':    return 'Propuesta de plan mensual';
    case 'show_card':             return (event.payload as ShowCardPayload).title;
    case 'show_category_selector':return (event.payload as ShowCategorySelectorPayload).title;
    case 'show_amount_editor':    return (event.payload as ShowAmountEditorPayload).title;
    case 'request_confirmation':  return 'Confirmación';
    default: return 'Asistente financiero';
  }
};

// ─── AgentEventRenderer ───────────────────────────────────────────────────────

export const AgentEventRenderer = () => {
  const { state, reset } = useAgentUI();
  const { events, status } = state;

  const isOpen = status !== 'idle';
  const isLoading = status === 'loading' || (status === 'active' && events.length === 0);
  const currentEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={reset}
      style={{ '--border-radius': '24px', '--width': 'min(640px, 95vw)', '--height': 'min(85dvh, 760px)' }}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar className={styles.toolbar}>
          <IonTitle className={styles.toolbarTitle}>{titleFor(currentEvent, isLoading)}</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={reset} className={styles.closeBtn}>✕</IonButton>
          </IonButtons>
        </IonToolbar>
        <div className={styles.stepBarWrap}>
          <StepBar event={currentEvent} isLoading={isLoading} />
        </div>
      </IonHeader>

      <IonContent className={styles.modalBody}>
        {isLoading && <LoadingState />}
        {!isLoading && currentEvent && renderEventContent(currentEvent)}
      </IonContent>
    </IonModal>
  );
};
