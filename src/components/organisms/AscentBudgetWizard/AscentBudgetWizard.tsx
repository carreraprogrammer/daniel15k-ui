import { useMemo, useState } from 'react';
import { IonIcon, IonModal } from '@ionic/react';
import {
  alertCircleOutline, arrowDownOutline, arrowForward, checkmarkCircle,
  close as closeIcon, informationCircleOutline, lockClosedOutline,
  sparklesOutline, walletOutline, cardOutline, flagOutline,
} from 'ionicons/icons';
import type { BudgetPlanDraft, WizardCategory, WizardData, WizardSubcategory } from '../../../types/finance.types';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import './ascentWizard.css';

// ── money (formato del diseño) ────────────────────────────────────────────────
const peso = (n: number) => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('es-CO');
const pesoK = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) { const v = n / 1e6; return '$' + v.toLocaleString('es-CO', { maximumFractionDigits: v % 1 === 0 ? 0 : 2 }) + ' M'; }
  if (a >= 1000) return '$' + Math.round(n / 1000) + ' mil';
  return '$' + Math.round(n);
};

const TIER_LABEL: Record<string, string> = {
  committed: 'Comprometido',
  necessary: 'Necesario · decides el monto',
  discretionary: 'Flexible · tu zona de elección',
  flexible: 'Flexible · tu zona de elección',
};

const prefilled = (s: WizardSubcategory) =>
  Boolean(s.locked) || s.source === 'planned_expense' || s.source === 'confirmed_budget';

export interface AscentBudgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (draft: BudgetPlanDraft) => void;
  wizardData?: WizardData;
  month: string; // "YYYY-MM"
  isEditMode?: boolean;
  existingMode?: 'conservative' | 'expected';
  // passthrough (compat con BudgetsPage) — no usados por el flujo ZBB
  hasPlanHistory?: boolean;
  adjustCategoryCode?: string | null;
  planConfirmedAt?: string;
}

type Step = 'intro' | 'list' | 'summary';

export const AscentBudgetWizard = ({
  isOpen, onClose, onComplete, wizardData, month, existingMode,
}: AscentBudgetWizardProps) => {
  const [step, setStep] = useState<Step>('intro');
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
  }, [month]);

  const cats: WizardCategory[] = (wizardData?.categories ?? []).filter((c) => c.code !== 'income');
  const income = wizardData?.income?.suggested_total ?? 0;
  const goal = wizardData?.goal_contribution?.amount ?? 0;
  const goalLabel = wizardData?.goal_contribution?.label ?? 'Aporte a ahorro';
  const extra = wizardData?.extraordinary_income;

  // Líneas fijas (prefijadas) de todas las categorías + el aporte a ahorro.
  const fixedRows = useMemo(() => {
    const rows: { code: string; name: string; icon?: string; amount: number; src: string }[] = [];
    cats.forEach((c) => c.subcategories.filter(prefilled).forEach((s) => {
      rows.push({
        code: s.code, name: s.name, icon: s.icon, amount: s.suggested_amount,
        src: s.source === 'recurring' ? 'Recurrente · bloqueado'
          : s.source === 'planned_expense' ? 'Gasto planeado'
          : 'Plan confirmado',
      });
    }));
    if (goal > 0) rows.push({ code: '__goal__', name: goalLabel, icon: 'wallet', amount: goal, src: 'Ahorro · automático' });
    return rows;
  }, [cats, goal, goalLabel]);

  const fixedTotal = fixedRows.reduce((a, r) => a + r.amount, 0);
  const startPool = Math.max(0, income - fixedTotal);
  const assignedByUser = Object.values(amounts).reduce((a, b) => a + b, 0);
  const por = startPool - assignedByUser;

  // decisiones = subcategorías user_decision (excluye fantasmas: sin gasto y sin destinar).
  const decisionCats = cats
    .map((c) => ({ ...c, decisions: c.subcategories.filter((s) => !prefilled(s)) }))
    .filter((c) => c.decisions.length > 0);
  const totalDecisions = decisionCats.reduce((a, c) => a + c.decisions.length, 0);
  const decided = decisionCats.reduce((a, c) => a + c.decisions.filter((s) => (amounts[s.code] ?? 0) > 0).length, 0);

  const chip = (code: string, d: number) => setAmounts((m) => ({ ...m, [code]: Math.max(0, (m[code] ?? 0) + d) }));
  const clear = (code: string) => setAmounts((m) => ({ ...m, [code]: 0 }));

  const tierTotals = useMemo(() => {
    const t: Record<string, number> = { committed: 0, necessary: 0, flexible: 0 };
    cats.forEach((c) => {
      const key = c.code === 'discretionary' ? 'flexible' : c.code === 'committed' ? 'committed' : c.code === 'necessary' ? 'necessary' : 'flexible';
      c.subcategories.forEach((s) => {
        t[key] += prefilled(s) ? s.suggested_amount : (amounts[s.code] ?? 0);
      });
    });
    t.committed += goal;
    return t;
  }, [cats, amounts, goal]);

  const submit = () => {
    const lines: { subcategory_code: string; amount: number }[] = [];
    cats.forEach((c) => c.subcategories.forEach((s) => {
      const amt = prefilled(s) ? s.suggested_amount : (amounts[s.code] ?? 0);
      if (amt > 0) lines.push({ subcategory_code: s.code, amount: amt });
    }));
    onComplete({
      month,
      total_income: income,
      lines,
      mode: existingMode ?? 'expected',
      goal_contribution_amount: goal,
    });
  };

  // ── UI atoms ──────────────────────────────────────────────────────────────
  const Nav = ({ eyebrow, title, stepLabel }: { eyebrow: string; title: string; stepLabel?: string }) => (
    <div className="awz-nav">
      <button className="awz-navbtn" onClick={onClose} aria-label="Cerrar"><IonIcon icon={closeIcon} /></button>
      <div className="awz-navttl"><span className="awz-eyebrow">{eyebrow}</span><span className="awz-h">{title}</span></div>
      {stepLabel && <span className="awz-step">{stepLabel}</span>}
    </div>
  );

  const PorBar = ({ compact }: { compact?: boolean }) => {
    const state = por === 0 ? 'is-zero' : por < 0 ? 'is-over' : 'is-pos';
    const placed = startPool - Math.max(0, por);
    const pct = startPool > 0 ? Math.max(0, Math.min(100, (placed / startPool) * 100)) : 0;
    const count = totalDecisions - decided;
    return (
      <div className={`por ${state} ${compact ? 'compact' : ''}`}>
        <div className="por-top">
          <span className="por-lbl">Por asignar</span>
          <span className="por-count">{count} sin decidir</span>
        </div>
        <div className="por-amt">
          {por < 0 ? <span className="neg">−</span> : <span className="cur">$</span>}
          {Math.abs(por).toLocaleString('es-CO')}
        </div>
        <div className="por-status">
          <span className="ic"><IonIcon icon={por === 0 ? checkmarkCircle : por < 0 ? alertCircleOutline : arrowDownOutline} /></span>
          {por === 0 ? 'Cada peso tiene un destino' : por < 0 ? 'Asignaste de más — baja alguna decisión' : 'Reparte hasta llegar a cero, a tu ritmo'}
        </div>
        <div className="por-meter"><div className="por-meter-fill" style={{ width: `${pct}%` }} /></div>
        <div className="por-foot">
          <span>Repartido <b>{pesoK(placed)}</b></span>
          <span>De <b>{pesoK(startPool)}</b> variables</span>
        </div>
      </div>
    );
  };

  const CategoryRow = ({ sub, color }: { sub: WizardSubcategory; color: string }) => {
    const amt = amounts[sub.code] ?? 0;
    const isActive = active === sub.code;
    const decidedRow = amt > 0;
    const ref = sub.reference;
    return (
      <div className={`crow ${isActive ? 'active' : decidedRow ? '' : 'undecided'}`} style={{ ['--c' as string]: color }}>
        <button className="crow-head" onClick={() => setActive((a) => (a === sub.code ? null : sub.code))}>
          <span className="crow-gem"><IonIcon icon={resolveNamedIcon(sub.icon ?? 'pricetagOutline')} /></span>
          <span className="crow-main">
            <span className="crow-name">{sub.name}</span>
            <span className="crow-ref">
              {ref && (ref.budgeted != null || ref.spent != null) ? (
                <span>
                  {ref.budgeted != null && <>destinaste <b>{pesoK(ref.budgeted)}</b></>}
                  {ref.budgeted != null && ref.spent != null && ' · '}
                  {ref.spent != null && <>gastaste <b>{pesoK(ref.spent)}</b></>}
                </span>
              ) : (
                <span>sin referencia aún — tú defines</span>
              )}
              {ref?.atypical && <><span className="dot" /><span className="atyp"><IonIcon icon={informationCircleOutline} /> mes atípico</span></>}
            </span>
          </span>
          <span className="crow-amt">
            <span className={`val ${decidedRow ? '' : 'zero'}`}>{peso(amt)}</span>
            {decidedRow ? <span className="tag">asignado</span> : <span className="tag dim">decidir ›</span>}
          </span>
        </button>
        {isActive && (
          <div className="crow-editor">
            <div className="crow-bignum">
              <span className="cur">$</span>
              <span className="n">{amt.toLocaleString('es-CO')}</span>
              <span className="caret" />
            </div>
            {ref && (ref.budgeted != null || ref.spent != null) && (
              <div className="crow-refline">
                {ref.budgeted != null && <>El mes pasado destinaste <b>{pesoK(ref.budgeted)}</b></>}
                {ref.spent != null && <> y gastaste <b>{pesoK(ref.spent)}</b></>}
                {ref.atypical && ' — fue mes atípico (prima)'}
              </div>
            )}
            <div className="chips">
              <button className="chip minus" onClick={() => chip(sub.code, -50000)}>−50 mil</button>
              <button className="chip minus" onClick={() => chip(sub.code, -25000)}>−25 mil</button>
              <button className="chip plus" onClick={() => chip(sub.code, 25000)}>+25 mil</button>
              <button className="chip plus" onClick={() => chip(sub.code, 50000)}>+50 mil</button>
            </div>
            <div className="crow-actions">
              {amt > 0 && <button className="crow-clear" onClick={() => clear(sub.code)}>Volver a $0</button>}
              <button className="crow-set" onClick={() => setActive(null)}><IonIcon icon={checkmarkCircle} /> Listo</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const LockedRow = ({ r }: { r: { name: string; icon?: string; amount: number; src: string } }) => (
    <div className="lrow">
      <span className="lrow-gem"><IonIcon icon={resolveNamedIcon(r.icon ?? 'walletOutline')} /></span>
      <span className="lrow-main">
        <span className="lrow-name">{r.name}</span>
        <span className="lrow-src">{r.src}</span>
      </span>
      <span className="lrow-r">
        <span className="lrow-amt">{peso(r.amount)}</span>
        <span className="lrow-lock"><IonIcon icon={lockClosedOutline} /></span>
      </span>
    </div>
  );

  // ── Screens ─────────────────────────────────────────────────────────────────
  const Intro = () => (
    <>
      <Nav eyebrow={/* first plan? */ 'Tu plan'} title={monthLabel} />
      <div className="intro">
        <span className="intro-eyebrow">Llegó tu ingreso</span>
        <h1 className="intro-h">Vamos a darle un destino a cada peso.</h1>
        <p className="intro-sub">
          El presupuesto no se genera solo: <b>tú decides</b> cuánto va a cada cosa.
          Ya aparté lo que es un hecho. El resto lo repartes tú, sin afán.
        </p>
        <div className="intro-card">
          <div className="intro-inrow">
            <span className="k"><span className="kic" style={{ background: 'var(--flexible-t)', color: 'var(--flexible)' }}><IonIcon icon={walletOutline} /></span>Ingreso del mes</span>
            <span className="v">{peso(income)}</span>
          </div>
          <div className="intro-inrow">
            <span className="k"><span className="kic" style={{ background: 'var(--committed-t)', color: 'var(--committed)' }}><IonIcon icon={lockClosedOutline} /></span>Líneas fijas (bloqueadas)</span>
            <span className="v sub">−{peso(fixedTotal)}</span>
          </div>
          <div className="intro-inrow total">
            <span className="k"><span className="kic" style={{ background: 'var(--committed-t)', color: 'var(--committed)' }}><IonIcon icon={arrowDownOutline} /></span>Por asignar</span>
            <span className="v">{peso(startPool)}</span>
          </div>
        </div>
        <p className="intro-sub" style={{ fontSize: 13, marginTop: 16 }}>
          Son <b>{totalDecisions} decisiones</b>. Cada categoría arranca en $0 — te muestro qué destinaste y gastaste antes, pero el número lo pones tú.
        </p>
      </div>
      <div className="dock">
        <button className="btn btn-primary" onClick={() => setStep('list')}>Empezar a repartir <IonIcon icon={arrowForward} /></button>
        <div className="dock-hint">Toma ~2 minutos · puedes cambiarlo cuando quieras</div>
      </div>
    </>
  );

  const List = () => (
    <>
      <Nav eyebrow="Repartiendo" title={monthLabel} stepLabel={`${decided}/${totalDecisions}`} />
      <PorBar />
      <div className="awz-body">
        {fixedRows.length > 0 && (
          <>
            <div className="sec"><span className="sec-l" style={{ color: 'var(--committed)' }}>Fijas · bloqueadas</span><span className="sec-hint">{peso(fixedTotal)}</span></div>
            {fixedRows.map((r) => <LockedRow key={r.code} r={r} />)}
          </>
        )}
        {decisionCats.map((c) => (
          <div key={c.code}>
            <div className="sec">
              <span className="sec-l" style={{ color: c.color }}>{TIER_LABEL[c.code] ?? c.name}</span>
              <span className="sec-hint">{pesoK(c.decisions.reduce((a, s) => a + (amounts[s.code] ?? 0), 0))} asignado</span>
            </div>
            {c.decisions.map((s) => <CategoryRow key={s.code} sub={s} color={c.color} />)}
          </div>
        ))}
      </div>
      <div className="dock">
        {por > 0 ? (
          <>
            <button className="btn btn-primary" onClick={() => setStep('summary')}>Ver mi plan</button>
            <div className="dock-hint">Te faltan {pesoK(por)} por repartir · toca una categoría para decidir</div>
          </>
        ) : por === 0 ? (
          <button className="btn btn-primary zero" onClick={() => setStep('summary')}><IonIcon icon={checkmarkCircle} /> Ver mi plan · cada peso con destino</button>
        ) : (
          <button className="btn btn-primary danger" onClick={() => setStep('summary')}>Asignaste {pesoK(-por)} de más · revisar</button>
        )}
      </div>
    </>
  );

  const Summary = () => {
    const over = por < 0;
    const hasPrima = (extra?.detected_recent ?? 0) > 0;
    return (
      <>
        <Nav eyebrow="Resumen" title={`Plan de ${monthLabel}`} />
        <div className="awz-body">
          <div className="sum-hero">
            <div className={`sum-ring ${over ? 'over' : ''}`}><IonIcon icon={over ? alertCircleOutline : checkmarkCircle} style={{ fontSize: 40 }} /></div>
            <h2 className="sum-title">{over ? `Te pasaste por ${pesoK(-por)}` : 'Cada peso tiene un destino'}</h2>
            <p className="sum-sub">
              {over
                ? <>Asignaste más de lo que entra este mes. No pasa nada — pero antes de confirmar, algo tiene que bajar <b>{pesoK(-por)}</b>.</>
                : <>Repartiste los <b>{pesoK(startPool)} variables</b> completos. Sabes a dónde va cada peso — sin sorpresas y sin culpa.</>}
            </p>
          </div>

          <div className="ledger">
            <div className="cell"><div className="l">Comprometido</div><div className="v">{pesoK(fixedTotal)}</div></div>
            <div className="cell"><div className="l">Asignado</div><div className="v">{pesoK(fixedTotal + assignedByUser)}</div></div>
            <div className="cell"><div className="l">Por asignar</div><div className={`v ${por === 0 ? 'good' : over ? 'bad' : ''}`}>{over ? '−' + peso(-por).slice(1) : peso(por)}</div></div>
          </div>

          {over ? (
            <div className="advisory">
              <span className="ic"><IonIcon icon={informationCircleOutline} /></span>
              <div className="advisory-body">
                <div className="advisory-t">De dónde suele salir</div>
                <div className="advisory-x">Flexible es tu zona de ajuste. Bajar ahí cierra la brecha de <b>{pesoK(-por)}</b> sin tocar lo necesario.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="sec" style={{ marginTop: 22 }}><span className="sec-l">Cómo quedó repartido</span><span className="sec-hint">del ingreso · {pesoK(income)}</span></div>
              <div className="tierbar">
                <div className="tierbar-track">
                  {(['committed', 'necessary', 'flexible'] as const).map((k) => {
                    const total = tierTotals.committed + tierTotals.necessary + tierTotals.flexible || 1;
                    const col = k === 'committed' ? 'var(--committed)' : k === 'necessary' ? 'var(--necessary)' : 'var(--flexible)';
                    return <div key={k} className="tierbar-seg" style={{ width: `${(tierTotals[k] / total) * 100}%`, background: col }} />;
                  })}
                </div>
                <div className="tierbar-legend">
                  {(['committed', 'necessary', 'flexible'] as const).map((k) => {
                    const name = k === 'committed' ? 'Comprometido' : k === 'necessary' ? 'Necesario' : 'Flexible';
                    const col = k === 'committed' ? 'var(--committed)' : k === 'necessary' ? 'var(--necessary)' : 'var(--flexible)';
                    return (
                      <div key={k} className="tl-row">
                        <span className="tl-dot" style={{ background: col }} />
                        <span className="tl-name">{name}</span>
                        <span className="tl-pct">{income > 0 ? Math.round((tierTotals[k] / income) * 100) : 0}%</span>
                        <span className="tl-amt">{pesoK(tierTotals[k])}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!over && hasPrima && (
            <div className="prima">
              <div className="prima-head">
                <span className="prima-gem"><IonIcon icon={sparklesOutline} /></span>
                <span className="t">
                  <span className="prima-eye">Ingreso extraordinario · prima</span>
                  <span className="prima-amt">+{peso(extra!.detected_recent)} para asignar</span>
                </span>
              </div>
              <p className="prima-x">No entra al reparto normal — así no te lo gastas sin querer. Es plata extra para mover la aguja en algo que importe:</p>
              <div className="prima-opts">
                <button className="prima-opt"><span className="oic"><IonIcon icon={flagOutline} /></span>Metas</button>
                <button className="prima-opt"><span className="oic"><IonIcon icon={cardOutline} /></span>Deuda</button>
                <button className="prima-opt"><span className="oic"><IonIcon icon={walletOutline} /></span>Bolsillos</button>
              </div>
            </div>
          )}
        </div>
        <div className="dock">
          {over ? (
            <>
              <button className="btn btn-primary danger" onClick={() => setStep('list')}>Ajustar Flexible <IonIcon icon={arrowForward} /></button>
              <button className="btn btn-ghost" onClick={() => setStep('list')}>Volver a la lista</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary zero" onClick={submit}><IonIcon icon={checkmarkCircle} /> Confirmar plan de {monthLabel}</button>
              <div className="dock-hint">Podrás ajustarlo cualquier día del mes</div>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <div className="awz">
        {!wizardData ? null : step === 'intro' ? <Intro /> : step === 'list' ? <List /> : <Summary />}
      </div>
    </IonModal>
  );
};
