import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IonIcon } from '@ionic/react';
import { warningOutline } from 'ionicons/icons';
import { Link } from 'react-router-dom';
import { IncomeSetupWizard } from '../../organisms/IncomeSetupWizard';
import { financeService } from '../../../services/financeService';
import type { CompletenessResponse } from '../../../types/finance.types';
import styles from './CompletenessIndicator.module.css';

const DIMENSION_META: Record<string, { label: string; to?: string; ctaLabel?: string; wizard?: string; dependsOn?: string }> = {
  income_profile:     { label: 'Perfil de ingresos', wizard: 'income_setup', ctaLabel: 'Configurar' },
  debts:              { label: 'Deudas', to: '/debts', ctaLabel: 'Completar' },
  recurring_expenses: { label: 'Gastos recurrentes', to: '/recurring', ctaLabel: 'Completar' },
  strategy:           { label: 'Estrategia financiera' },
  monthly_plan:       { label: 'Plan mensual', to: '/budgets', ctaLabel: 'Armar plan', dependsOn: 'income_profile' },
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
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [incomeWizardOpen, setIncomeWizardOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Ocultarse cuando hay cualquier overlay encima (sheets de Ionic, chat, etc.).
  // La regla CSS con body.overlay-open nunca funcionó porque nadie ponía la clase.
  useEffect(() => {
    const check = () => setOverlayOpen(
      Boolean(document.querySelector('ion-modal.show-modal, ion-popover.show-modal, [data-app-overlay]')),
    );
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    check();
    return () => observer.disconnect();
  }, []);

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

  if (!data || overlayOpen) return null;

  const gaps = [...data.missing, ...data.partial, ...data.stale, ...data.conflicting];
  if (gaps.length === 0) return null;

  const gapDimensions = gaps.map((key) => {
    const meta = DIMENSION_META[key];
    const blockedByDep = meta?.dependsOn ? gaps.includes(meta.dependsOn) : false;
    return {
      key,
      label: meta?.label ?? key,
      to: blockedByDep ? undefined : meta?.to,
      wizard: blockedByDep ? undefined : meta?.wizard,
      ctaLabel: meta?.ctaLabel ?? 'Completar →',
      blockedByDep,
      depLabel: meta?.dependsOn ? (DIMENSION_META[meta.dependsOn]?.label ?? meta.dependsOn) : undefined,
      status: data.dimensions[key]?.status ?? 'missing',
      message: data.dimensions[key]?.reason ?? data.dimensions[key]?.message ?? '',
    };
  });

  return (
    <>
      {createPortal(
        <div className={styles.root} ref={panelRef}>
          {open && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <IonIcon className={styles.panelIcon} icon={warningOutline} aria-hidden="true" />
                <p className={styles.panelTitle}>Información incompleta</p>
              </div>
              <ul className={styles.list}>
                {gapDimensions.map(({ key, label, to, wizard, ctaLabel, blockedByDep, depLabel, status, message }) => (
                  <li key={key} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemLabel}>{label}</span>
                      <span className={[styles.badge, styles[`badge_${status}`]].join(' ')}>
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                    {blockedByDep
                      ? <p className={styles.itemDep}>Primero completa {depLabel}</p>
                      : message && <p className={styles.itemMessage}>{message}</p>
                    }
                    {!blockedByDep && wizard === 'income_setup' && (
                      <button
                        type="button"
                        className={styles.itemCta}
                        onClick={() => { setOpen(false); setIncomeWizardOpen(true); }}
                      >
                        {ctaLabel}
                      </button>
                    )}
                    {!blockedByDep && to && !wizard && (
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
            <IonIcon className={styles.bubbleIcon} icon={warningOutline} aria-hidden="true" />
            <span className={styles.bubbleCount}>{gaps.length}</span>
          </button>
        </div>,
        document.body
      )}

      <IncomeSetupWizard
        isOpen={incomeWizardOpen}
        onClose={() => setIncomeWizardOpen(false)}
        onComplete={loadCompleteness}
      />
    </>
  );
};
