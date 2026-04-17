import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IncomeSetupWizard } from '../../organisms/IncomeSetupWizard';
import { financeService } from '../../../services/financeService';
import type { CompletenessResponse } from '../../../types/finance.types';
import styles from './CompletenessIndicator.module.css';

const DIMENSION_META: Record<string, { label: string; to?: string; ctaLabel?: string; wizard?: string }> = {
  income_profile:     { label: 'Perfil de ingresos', wizard: 'income_setup', ctaLabel: 'Completar →' },
  debts:              { label: 'Deudas', to: '/debts', ctaLabel: 'Completar →' },
  recurring_expenses: { label: 'Gastos recurrentes', to: '/recurring', ctaLabel: 'Completar →' },
  strategy:           { label: 'Estrategia financiera' },
  monthly_plan:       { label: 'Plan mensual', to: '/budgets', ctaLabel: 'Ver presupuestos →' },
};

const STATUS_LABEL: Record<string, string> = {
  missing:     'Falta',
  partial:     'Incompleto',
  stale:       'Desactualizado',
  conflicting: 'Conflicto',
};

export const CompletenessIndicator = () => {
  const [data, setData] = useState<CompletenessResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [incomeWizardOpen, setIncomeWizardOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadCompleteness = () => {
    financeService.fetchCompleteness().then(setData).catch(() => null);
  };

  useEffect(() => {
    loadCompleteness();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!data) return null;

  const gaps = [...data.missing, ...data.partial, ...data.stale, ...data.conflicting];
  if (gaps.length === 0) return null;

  const gapDimensions = gaps.map((key) => {
    const meta = DIMENSION_META[key];
    return {
      key,
      label: meta?.label ?? key,
      to: meta?.to,
      wizard: meta?.wizard,
      ctaLabel: meta?.ctaLabel ?? 'Completar →',
      status: data.dimensions[key]?.status ?? 'missing',
      message: data.dimensions[key]?.message ?? '',
    };
  });

  return (
    <>
      <div className={styles.root} ref={panelRef}>
        {open && (
          <div className={styles.panel}>
            <p className={styles.panelTitle}>Información incompleta</p>
            <p className={styles.panelSubtitle}>
              El sistema necesita estos datos para ayudarte mejor.
            </p>
            <ul className={styles.list}>
              {gapDimensions.map(({ key, label, to, wizard, ctaLabel, status, message }) => (
                <li key={key} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemLabel}>{label ?? key}</span>
                    <span className={[styles.badge, styles[`badge_${status}`]].join(' ')}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>
                  {message && <p className={styles.itemMessage}>{message}</p>}
                  {wizard === 'income_setup' && (
                    <button
                      type="button"
                      className={styles.itemCta}
                      onClick={() => { setOpen(false); setIncomeWizardOpen(true); }}
                    >
                      {ctaLabel}
                    </button>
                  )}
                  {to && !wizard && (
                    <Link to={to} className={styles.itemCta} onClick={() => setOpen(false)}>
                      {ctaLabel}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className={styles.bubble}
          onClick={() => setOpen((v) => !v)}
          aria-label={`${gaps.length} datos incompletos`}
        >
          <span className={styles.pulseRing} />
          <span className={styles.bubbleIcon}>⚠</span>
          <span className={styles.bubbleCount}>{gaps.length}</span>
        </button>
      </div>

      <IncomeSetupWizard
        isOpen={incomeWizardOpen}
        onClose={() => setIncomeWizardOpen(false)}
        onComplete={loadCompleteness}
      />
    </>
  );
};
