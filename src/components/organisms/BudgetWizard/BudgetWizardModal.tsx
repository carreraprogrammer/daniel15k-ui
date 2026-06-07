import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { IonContent, IonIcon, IonModal } from '@ionic/react';
import { lockClosedOutline, trophyOutline, chevronForwardOutline, arrowBackOutline, closeOutline, checkmarkOutline, sparklesOutline } from 'ionicons/icons';
import { resolveNamedIcon } from './iconRegistry';
import type { BudgetLineItem, BudgetPlanDraft, WizardCategory, WizardData, WizardSubcategory } from '../../../types/finance.types';
import { BrandMark } from '../../atoms/BrandMark';
import styles from './BudgetWizardModal.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type WizardMode = 'crear' | 'replantear' | 'ajustar';

interface BudgetWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (planData: BudgetPlanDraft) => void;
  wizardData?: WizardData;
  month: string;
  hasPlanHistory?: boolean;
  isEditMode?: boolean;
  adjustCategoryCode?: string;
  existingMode?: 'conservative' | 'expected';
  planConfirmedAt?: string;
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { c: string }> = {
  committed:     { c: '#C0392B' },
  necessary:     { c: '#D4732A' },
  discretionary: { c: '#C9980A' },
  investment:    { c: '#1A9E4A' },
  social:        { c: '#8A4FD8' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

function fmt(n: number): string {
  return `$${fmtK(n)}`;
}

function formatMonthLabel(month: string): string {
  const [yearRaw, monthRaw] = month.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return month;
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1));
}

function detectMode(hasPlanHistory: boolean, isEditMode: boolean, incomeNeedsSetup: boolean): WizardMode {
  if (isEditMode) return 'ajustar';
  if (hasPlanHistory && !incomeNeedsSetup) return 'replantear';
  return 'crear';
}

// subcatAmounts is keyed by "catCode:subCode" to avoid collisions when the same
// sub.code exists in multiple categories (e.g. "ejercicio" in both necessary + investment).
function subKey(catCode: string, subCode: string): string {
  return `${catCode}:${subCode}`;
}

function buildSubcatInit(categories: WizardCategory[]): Record<string, number> {
  const init: Record<string, number> = {};
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      init[subKey(cat.code, sub.code)] = sub.suggested_amount;
    }
  }
  return init;
}

function buildPlanLines(categories: WizardCategory[], subcatAmounts: Record<string, number>): BudgetLineItem[] {
  const lines: BudgetLineItem[] = [];
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      const amt = subcatAmounts[subKey(cat.code, sub.code)] ?? 0;
      if (amt > 0) lines.push({ subcategory_code: sub.code, amount: amt });
    }
  }
  return lines;
}

function catTotal(cat: WizardCategory, subcatAmounts: Record<string, number>): number {
  return cat.subcategories.reduce((s, sub) => s + (subcatAmounts[subKey(cat.code, sub.code)] ?? 0), 0);
}

function sliderMax(sub: WizardSubcategory): number {
  const s = sub.suggested_amount;
  if (s === 0) return 2_000_000;
  return Math.max(Math.round((s * 3) / 50_000) * 50_000, 500_000);
}


// ── LowConfBlock ───────────────────────────────────────────────────────────────

const LOW_CONF_MAGNITUDES = [
  { label: '$50K',  amt: 50_000 },
  { label: '$100K', amt: 100_000 },
  { label: '$200K', amt: 200_000 },
  { label: '$400K', amt: 400_000 },
  { label: 'No suelo gastar', amt: 0 },
];

interface LowConfBlockProps {
  catCode: string;
  lowSubs: WizardSubcategory[];
  subcatAmounts: Record<string, number>;
  onSetAmount: (code: string, amount: number) => void;
}

function LowConfBlock({ catCode, lowSubs, subcatAmounts, onSetAmount }: LowConfBlockProps) {
  if (lowSubs.length === 0) return null;
  return (
    <div className={styles.lowConfBlock}>
      <div className={styles.lowConfTag}>
        {lowSubs.length === 1 ? '1 cosa que no sé' : `${lowSubs.length} cosas que no sé`}
      </div>
      {lowSubs.map((sub) => {
        const current = subcatAmounts[subKey(catCode, sub.code)] ?? sub.suggested_amount;
        return (
          <div key={sub.code} className={styles.lowConfItem}>
            <div className={styles.lowConfQuestion}>¿{sub.name} cómo va para ti?</div>
            <div className={styles.lowConfChips}>
              {LOW_CONF_MAGNITUDES.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className={`${styles.lowConfChip} ${current === m.amt ? styles.lowConfChipActive : ''}`}
                  onClick={() => onSetAmount(subKey(catCode, sub.code), m.amt)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PorAsignarHero ─────────────────────────────────────────────────────────────

interface PorAsignarHeroProps {
  porAsignar: number;
  totalIncome: number;
  goalContribution: number;
  totalPlanned: number;
}

function PorAsignarHero({ porAsignar, totalIncome, goalContribution, totalPlanned }: PorAsignarHeroProps) {
  const isZero = porAsignar === 0;
  const isOver = porAsignar < 0;
  const allocated = goalContribution + totalPlanned;
  const pct = totalIncome > 0 ? Math.min(allocated / totalIncome, 1) : 0;

  const heroClass = [styles.hero, isZero ? styles.heroZero : isOver ? styles.heroOver : ''].filter(Boolean).join(' ');
  const amtClass = [styles.heroAmount, isZero ? styles.heroAmtZero : isOver ? styles.heroAmtOver : ''].filter(Boolean).join(' ');
  const statusClass = [styles.heroStatus, isZero ? styles.heroStatusZero : isOver ? styles.heroStatusOver : ''].filter(Boolean).join(' ');
  const fillClass = [styles.heroMeterFill, isZero ? styles.heroMeterFull : isOver ? styles.heroMeterOver : ''].filter(Boolean).join(' ');

  const statusText = isZero
    ? '✓ Cada peso tiene destino'
    : isOver
    ? `Te pasaste ${fmt(-porAsignar)}`
    : `${fmt(porAsignar)} por asignar`;

  return (
    <div className={heroClass}>
      <div className={styles.heroEyebrow}>
        <span className={styles.heroDot} />
        Por asignar
      </div>
      <div className={amtClass}>
        <span className={styles.heroCur}>$</span>
        {fmtK(Math.abs(porAsignar))}
      </div>
      <div className={statusClass}>{statusText}</div>
      <div className={styles.heroMeterWrap}>
        <div className={fillClass} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={styles.heroFoot}>
        <span>Ingreso {fmt(totalIncome)}</span>
        <span>Asignado {fmt(allocated)}</span>
      </div>
    </div>
  );
}

// ── StepPorAsignar (compact header for overlays) ───────────────────────────────

interface StepPorAsignarProps {
  porAsignar: number;
  totalIncome: number;
  allocated: number;
  step?: string;
}

function StepPorAsignar({ porAsignar, totalIncome, allocated, step }: StepPorAsignarProps) {
  const isZero = porAsignar === 0;
  const isOver = porAsignar < 0;
  const pct = totalIncome > 0 ? Math.min(allocated / totalIncome, 1) : 0;
  const valClass = [styles.stepPorVal, isZero ? styles.stepPorValZero : isOver ? styles.stepPorValOver : ''].filter(Boolean).join(' ');
  const fillClass = [styles.stepMeterFill, isZero ? styles.stepMeterFull : ''].filter(Boolean).join(' ');

  return (
    <div className={styles.stepPorAsignar}>
      <span className={styles.stepPorLbl}>Por asignar</span>
      <span className={valClass}>
        <span className={styles.stepPorCur}>$</span>
        {fmtK(Math.abs(porAsignar))}
      </span>
      {step && <span className={styles.stepCount}>{step}</span>}
      <div className={styles.stepMeterWrap}>
        <div className={fillClass} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

// ── GoalCard ───────────────────────────────────────────────────────────────────

interface GoalCardProps {
  amount: number;
  label: string;
  phase?: string | null;
  totalIncome: number;
}

function GoalCard({ amount, label, phase, totalIncome }: GoalCardProps) {
  const pct = totalIncome > 0 ? Math.min(amount / totalIncome, 1) : 0;
  const phaseLabel = phase === 'emergency_fund' ? 'Fondo emergencia' : phase === 'debt_payoff' ? 'Pago deudas' : 'Objetivo';

  return (
    <div className={styles.goalCard}>
      <div className={styles.goalRow}>
        <div className={styles.goalGem}>
          <IonIcon icon={trophyOutline} />
        </div>
        <div className={styles.goalBody}>
          <div className={styles.goalName}>
            {label}
            <span className={styles.goalTag}>{phaseLabel}</span>
          </div>
          <div className={styles.goalWhy}>Separado antes de distribuir el resto</div>
        </div>
        <div className={styles.goalRight}>
          <span className={styles.goalAmt}>{fmt(amount)}</span>
          <IonIcon icon={lockClosedOutline} className={styles.goalLock} />
        </div>
      </div>
      <div className={styles.goalProg}>
        <div className={styles.goalProgFill} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className={styles.goalMeta}>
        <span>{(pct * 100).toFixed(0)}% del ingreso</span>
        <span>{fmt(amount)} / mes</span>
      </div>
    </div>
  );
}

// ── CategoryFlatRow ────────────────────────────────────────────────────────────

interface CategoryFlatRowProps {
  cat: WizardCategory;
  subcatAmounts: Record<string, number>;
  totalIncome: number;
  onClick: () => void;
}

function CategoryFlatRow({ cat, subcatAmounts, totalIncome, onClick }: CategoryFlatRowProps) {
  const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E' };
  const total = catTotal(cat, subcatAmounts);
  const pct = totalIncome > 0 ? Math.min(total / totalIncome, 1) : 0;
  const subCount = cat.subcategories.length;

  return (
    <button
      type="button"
      className={styles.catRow}
      style={{ '--cat-c': col.c } as CSSProperties}
      onClick={onClick}
    >
      <div className={styles.catGem}>
        <IonIcon icon={resolveNamedIcon(cat.icon)} />
      </div>
      <div className={styles.catMain}>
        <div className={styles.catName}>{cat.name}</div>
        <div className={styles.catWhy}>{cat.description}</div>
      </div>
      <div className={styles.catRight}>
        <span className={styles.catAmt}>{fmt(total)}</span>
        <span className={styles.catSubs}>{subCount} sub</span>
      </div>
      <div className={styles.catBarWrap}>
        <div className={styles.catBar}>
          <div className={styles.catBarFill} style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </button>
  );
}

// ── SliderRow (subcategory slider editor) ──────────────────────────────────────

interface SliderRowProps {
  sub: WizardSubcategory;
  catColor: string;
  amount: number;
  locked?: boolean;
  onChange: (amt: number) => void;
}

function SliderRow({ sub, catColor, amount, locked = false, onChange }: SliderRowProps) {
  const max = sliderMax(sub);
  const step = max >= 1_000_000 ? 25_000 : 10_000;
  const fillPct = max > 0 ? Math.min(amount / max, 1) * 100 : 0;

  return (
    <div
      className={`${styles.sliderRow} ${locked ? styles.sliderRowLocked : ''}`}
      style={{ '--cat-c': catColor } as CSSProperties}
    >
      <div className={styles.sliderHead}>
        <div className={styles.sliderGem}>
          <IonIcon icon={resolveNamedIcon(sub.icon)} />
        </div>
        <span className={styles.sliderName}>{sub.name}</span>
        <span className={styles.sliderAmt}>{fmt(amount)}</span>
      </div>
      <div className={styles.sliderTrackWrap}>
        <div className={styles.sliderTrackBg} />
        <div className={styles.sliderTrackFill} style={{ width: `${fillPct}%` }} />
        <div className={styles.sliderThumb} style={{ left: `${fillPct}%` }} />
        <input
          type="range"
          className={styles.sliderInput}
          min={0}
          max={max}
          step={step}
          value={amount}
          disabled={locked}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      {sub.edit_hint && <div className={styles.sliderHint}>{sub.edit_hint}</div>}
    </div>
  );
}

// ── FocusEditor (full-screen category editor) ──────────────────────────────────

interface FocusEditorProps {
  cat: WizardCategory;
  subcatAmounts: Record<string, number>;
  porAsignar: number;
  totalIncome: number;
  planLocked?: boolean;
  onSetSub: (code: string, amt: number) => void;
  onClose: () => void;
}

function FocusEditor({ cat, subcatAmounts, porAsignar, totalIncome, planLocked = false, onSetSub, onClose }: FocusEditorProps) {
  const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E' };
  const total = catTotal(cat, subcatAmounts);
  const allocated = totalIncome - porAsignar;
  const lowSubs = cat.subcategories.filter((s) => s.confidence === 'low' && !s.locked);

  return (
    <div className={styles.stepOverlay} style={{ '--cat-c': col.c } as CSSProperties}>
      <div className={styles.stepTop}>
        <div className={styles.stepTopRow}>
          <div className={styles.stepSlot}>
            <button type="button" className={styles.stepIconBtn} onClick={onClose}>
              <IonIcon icon={arrowBackOutline} />
            </button>
          </div>
          <StepPorAsignar
            porAsignar={porAsignar}
            totalIncome={totalIncome}
            allocated={allocated}
          />
          <div className={styles.stepSlot}>
            {planLocked && (
              <button type="button" className={styles.stepIconBtn} onClick={onClose}>
                <IonIcon icon={closeOutline} />
              </button>
            )}
          </div>
        </div>
        <div className={styles.stepMeterWrap} style={{ marginTop: 0, display: 'none' }} />
      </div>

      <div className={styles.stepBody}>
        <div className={styles.stepId}>
          <div className={styles.stepIdGem}>
            <IonIcon icon={resolveNamedIcon(cat.icon)} />
          </div>
          <div className={styles.stepIdMeta}>
            <div className={styles.stepIdName}>{cat.name}</div>
            <div className={styles.stepIdDesc}>{cat.description}</div>
          </div>
          <div className={styles.stepIdTotal}>{fmt(total)}</div>
        </div>

        <div className={styles.stepKicker}>Subcategorías</div>
        <div className={styles.stepSubs}>
          {cat.subcategories.map((sub) => (
            <SliderRow
              key={sub.code}
              sub={sub}
              catColor={col.c}
              amount={subcatAmounts[subKey(cat.code, sub.code)] ?? 0}
              locked={sub.locked || planLocked}
              onChange={(amt) => onSetSub(subKey(cat.code, sub.code), amt)}
            />
          ))}
        </div>

        {!planLocked && (
          <LowConfBlock
            catCode={cat.code}
            lowSubs={lowSubs}
            subcatAmounts={subcatAmounts}
            onSetAmount={onSetSub}
          />
        )}
      </div>

      <div className={styles.stepDock}>
        <button
          type="button"
          className={`${styles.dockBtn} ${styles.dockPrimary}`}
          onClick={onClose}
        >
          <IonIcon icon={checkmarkOutline} />
          {planLocked ? 'Cerrar' : 'Listo'}
        </button>
      </div>
    </div>
  );
}

// ── WizardFlow (step-by-step crear mode) ───────────────────────────────────────

interface WizardFlowProps {
  cats: WizardCategory[];
  goalContribution: number;
  activeIndex: number;
  porAsignar: number;
  totalIncome: number;
  subcatAmounts: Record<string, number>;
  onSetSub: (code: string, amt: number) => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

function WizardFlow({ cats, goalContribution, activeIndex, porAsignar, totalIncome, subcatAmounts, onSetSub, onBack, onNext, onClose }: WizardFlowProps) {
  const cat = cats[activeIndex];
  if (!cat) return null;
  const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E' };
  const total = catTotal(cat, subcatAmounts);
  const isLast = activeIndex >= cats.length - 1;
  const allocated = totalIncome - porAsignar;
  const stepLabel = `${activeIndex + 1} / ${cats.length}`;
  const lowSubs = cat.subcategories.filter((s) => s.confidence === 'low' && !s.locked);

  return (
    <div className={styles.stepOverlay} style={{ '--cat-c': col.c } as CSSProperties}>
      <div className={styles.stepTop}>
        <div className={styles.stepTopRow}>
          <div className={styles.stepSlot}>
            <button type="button" className={styles.stepIconBtn} onClick={onBack}>
              <IonIcon icon={activeIndex === 0 ? closeOutline : arrowBackOutline} />
            </button>
          </div>
          <StepPorAsignar
            porAsignar={porAsignar}
            totalIncome={totalIncome}
            allocated={allocated}
            step={stepLabel}
          />
          <div className={styles.stepSlot} />
        </div>
        <div className={styles.stepMeterWrap}>
          <div
            className={styles.stepMeterFill}
            style={{ width: `${((activeIndex + 1) / cats.length) * 100}%` }}
          />
        </div>
      </div>

      <div className={styles.stepBody}>
        <div className={styles.stepId}>
          <div className={styles.stepIdGem}>
            <IonIcon icon={resolveNamedIcon(cat.icon)} />
          </div>
          <div className={styles.stepIdMeta}>
            <div className={styles.stepIdName}>{cat.name}</div>
            <div className={styles.stepIdDesc}>{cat.description}</div>
          </div>
          <div className={styles.stepIdTotal}>{fmt(total)}</div>
        </div>

        <div className={styles.stepKicker}>Ajustá cada subcategoría</div>
        <div className={styles.stepSubs}>
          {cat.subcategories.map((sub) => (
            <SliderRow
              key={sub.code}
              sub={sub}
              catColor={col.c}
              amount={subcatAmounts[subKey(cat.code, sub.code)] ?? 0}
              locked={sub.locked}
              onChange={(amt) => onSetSub(subKey(cat.code, sub.code), amt)}
            />
          ))}
        </div>

        <LowConfBlock
          catCode={cat.code}
          lowSubs={lowSubs}
          subcatAmounts={subcatAmounts}
          onSetAmount={onSetSub}
        />
      </div>

      <div className={styles.stepDock}>
        <button
          type="button"
          className={`${styles.dockBtn} ${styles.dockPrimary}`}
          onClick={onNext}
        >
          {isLast ? (
            <>
              <IonIcon icon={sparklesOutline} />
              Ver mi plan
            </>
          ) : (
            <>
              Siguiente · {cats[activeIndex + 1]?.name}
              <IonIcon icon={chevronForwardOutline} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── LeftoverSheet ──────────────────────────────────────────────────────────────

interface LeftoverSheetProps {
  amount: number;
  goalLabel: string;
  cats: WizardCategory[];
  subcatAmounts: Record<string, number>;
  onGoal: () => void;
  onCat: (code: string) => void;
  onSplit: () => void;
  onKeep: () => void;
}

function LeftoverSheet({ amount, goalLabel, cats, subcatAmounts, onGoal, onCat, onSplit, onKeep }: LeftoverSheetProps) {
  const distributableCats = cats.filter((c) => c.code !== 'committed');

  return (
    <>
      <div className={styles.leftoverBackdrop} onClick={onKeep} />
      <div className={styles.leftoverSheet}>
        <div className={styles.leftoverHandle} />
        <div className={styles.leftoverHead}>
          <span className={styles.leftoverAmt}>{fmt(amount)}</span>
          <span className={styles.leftoverLbl}>sin asignar · ¿dónde va este peso?</span>
        </div>
        <div className={styles.destList}>
          <button
            type="button"
            className={styles.destRow}
            style={{ '--dest-c': '#1A9E4A' } as CSSProperties}
            onClick={onGoal}
          >
            <div className={styles.destGem}>
              <IonIcon icon={trophyOutline} />
            </div>
            <span className={styles.destName}>Acelerar {goalLabel}</span>
            <span className={styles.destHint}>{fmt(amount)}</span>
          </button>

          {distributableCats.slice(0, 2).map((cat) => {
            const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E' };
            return (
              <button
                key={cat.code}
                type="button"
                className={styles.destRow}
                style={{ '--dest-c': col.c } as CSSProperties}
                onClick={() => onCat(cat.code)}
              >
                <div className={styles.destGem}>
                  <IonIcon icon={resolveNamedIcon(cat.icon)} />
                </div>
                <span className={styles.destName}>Agregar a {cat.name}</span>
                <span className={styles.destHint}>{fmt(catTotal(cat, subcatAmounts) + amount)}</span>
              </button>
            );
          })}

          <button
            type="button"
            className={styles.destRow}
            style={{ '--dest-c': '#0E96AD' } as CSSProperties}
            onClick={onSplit}
          >
            <div className={styles.destGem}>
              <IonIcon icon={sparklesOutline} />
            </div>
            <span className={styles.destName}>Repartir proporcionalmente</span>
            <span className={styles.destHint}>{fmt(amount)}</span>
          </button>
        </div>
        <button type="button" className={styles.leftoverKeep} onClick={onKeep}>
          Dejar sin asignar por ahora
        </button>
      </div>
    </>
  );
}

// ── Celebration ────────────────────────────────────────────────────────────────

interface CelebrationProps {
  totalIncome: number;
  onDone: () => void;
}

function Celebration({ totalIncome, onDone }: CelebrationProps) {
  return (
    <div className={styles.celebrateOverlay}>
      <div className={styles.celebrateRing}>✓</div>
      <div className={styles.celebrateTitle}>Cada peso tiene destino</div>
      <div className={styles.celebrateBody}>
        Asignaste {fmt(totalIncome)} completos. Tu plan está equilibrado y listo para ser firmado.
      </div>
      <div style={{ marginTop: 32, width: '100%' }}>
        <button
          type="button"
          className={`${styles.dockBtn} ${styles.dockZero}`}
          onClick={onDone}
        >
          <IonIcon icon={checkmarkOutline} />
          Firmar plan
        </button>
      </div>
    </div>
  );
}

// ── WizardIntro ────────────────────────────────────────────────────────────────

interface WizardIntroProps {
  totalIncome: number;
  onStart: () => void;
  onClose: () => void;
}

function WizardIntro({ totalIncome, onStart, onClose }: WizardIntroProps) {
  return (
    <div className={styles.introOverlay}>
      <div className={styles.introArt}>
        <div className={styles.introCoin}>💰</div>
      </div>
      <div className={styles.introEyebrow}>Tu primer plan</div>
      <div className={styles.introTitle}>Cada peso tiene{'\n'}un destino</div>
      <div className={styles.introAmount}>{fmt(totalIncome)}</div>
      <div className={styles.introBody}>
        Vamos a repartir tu ingreso categoría por categoría. Cuando llegues a $0 por asignar, tu presupuesto está listo.
      </div>
      <div style={{ flex: 1 }} />
      <div className={styles.introDock}>
        <button
          type="button"
          className={`${styles.dockBtn} ${styles.dockPrimary}`}
          onClick={onStart}
        >
          Empezar a repartir
        </button>
        <button
          type="button"
          className={`${styles.dockBtn} ${styles.dockSecondary}`}
          onClick={onClose}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const BudgetWizardModal = ({
  isOpen, onClose, onComplete, wizardData, month,
  hasPlanHistory = false, isEditMode = false,
  adjustCategoryCode, existingMode, planConfirmedAt,
}: BudgetWizardModalProps) => {

  useEffect(() => {
    if (isOpen) document.body.setAttribute('data-wizard-open', 'true');
    else document.body.removeAttribute('data-wizard-open');
    return () => document.body.removeAttribute('data-wizard-open');
  }, [isOpen]);

  const incomeNeedsSetup = wizardData?.income.needs_setup === true;
  const mode = detectMode(hasPlanHistory, isEditMode, incomeNeedsSetup);
  const categories = wizardData?.categories ?? [];
  const totalIncome = wizardData?.income.suggested_total ?? 0;

  // ── State ──────────────────────────────────────────────────────────────────
  const [subcatAmounts, setSubcatAmounts] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [leftoverOpen, setLeftoverOpen] = useState(false);
  const [goalExtra, setGoalExtra] = useState(0);
  const originalAmountsRef = useRef<Record<string, number>>({});
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (!wizardData) return;
    const init = buildSubcatInit(wizardData.categories);
    setSubcatAmounts(init);
    originalAmountsRef.current = init;
    setActiveIndex(0);
    setGoalExtra(0);
    setCelebrate(false);
    celebratedRef.current = false;
    setLeftoverOpen(false);

    if (mode === 'crear') {
      setShowIntro(true);
      setFocusCode(null);
    } else if (mode === 'ajustar') {
      setFocusCode(adjustCategoryCode ?? wizardData.categories[0]?.code ?? null);
      setShowIntro(false);
    } else {
      setFocusCode(null);
      setShowIntro(false);
    }
  }, [wizardData, mode]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const goalContribution = wizardData?.goal_contribution?.amount ?? 0;
  const goalLabel = wizardData?.goal_contribution?.label ?? 'Objetivo financiero';
  const goalPhase = wizardData?.goal_contribution?.phase;
  const effectiveGoal = goalContribution + goalExtra;
  const totalPlanned = categories.reduce((s, cat) => s + catTotal(cat, subcatAmounts), 0);
  const porAsignar = totalIncome - effectiveGoal - totalPlanned;

  const changesCount = Object.keys(subcatAmounts).filter(
    (code) => subcatAmounts[code] !== (originalAmountsRef.current[code] ?? subcatAmounts[code])
  ).length;

  const isWithinGraceWindow = planConfirmedAt
    ? Date.now() - new Date(planConfirmedAt).getTime() < 48 * 60 * 60 * 1000
    : true;

  // ── Celebration trigger ────────────────────────────────────────────────────
  useEffect(() => {
    if (porAsignar === 0 && mode === 'replantear' && !celebratedRef.current) {
      celebratedRef.current = true;
      const t = setTimeout(() => setCelebrate(true), 320);
      return () => clearTimeout(t);
    }
    if (porAsignar !== 0) celebratedRef.current = false;
  }, [porAsignar, mode]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const setSub = (code: string, amt: number) =>
    setSubcatAmounts((prev) => ({ ...prev, [code]: Math.max(0, amt) }));

  const handleSave = (overrideAmounts?: Record<string, number>) => {
    if (!wizardData) return;
    const amounts = overrideAmounts ?? subcatAmounts;
    const lines = buildPlanLines(categories, amounts);
    onComplete({ month, total_income: totalIncome, lines, mode: existingMode ?? 'expected', goal_contribution_amount: effectiveGoal > 0 ? effectiveGoal : undefined });
  };

  const addToGoal = () => {
    if (porAsignar <= 0) return;
    setGoalExtra((g) => g + porAsignar);
    setLeftoverOpen(false);
  };

  const sendToCat = (catCode: string) => {
    if (porAsignar <= 0) return;
    const cat = categories.find((c) => c.code === catCode);
    if (!cat || cat.subcategories.length === 0) return;
    const unlocked = cat.subcategories.filter((s) => !s.locked);
    if (unlocked.length === 0) return;
    const share = Math.round(porAsignar / unlocked.length / 10_000) * 10_000;
    setSubcatAmounts((prev) => {
      const next = { ...prev };
      unlocked.forEach((s) => { const k = subKey(catCode, s.code); next[k] = (next[k] ?? 0) + share; });
      return next;
    });
    setLeftoverOpen(false);
  };

  const splitEvenly = () => {
    if (porAsignar <= 0) return;
    const allUnlocked: Array<{ catCode: string; sub: WizardSubcategory }> = [];
    for (const cat of categories) {
      for (const sub of cat.subcategories) {
        if (!sub.locked) allUnlocked.push({ catCode: cat.code, sub });
      }
    }
    if (allUnlocked.length === 0) return;
    const share = Math.round(porAsignar / allUnlocked.length / 10_000) * 10_000;
    setSubcatAmounts((prev) => {
      const next = { ...prev };
      allUnlocked.forEach(({ catCode: cc, sub: s }) => { const k = subKey(cc, s.code); next[k] = (next[k] ?? 0) + share; });
      return next;
    });
    setLeftoverOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const allocated = effectiveGoal + totalPlanned;
  const focusCat = focusCode ? categories.find((c) => c.code === focusCode) ?? null : null;

  return (
    <IonModal
      className={styles.modal}
      isOpen={isOpen}
      onDidDismiss={onClose}
      keepContentsMounted
      style={{ '--border-radius': '0px', '--width': '100vw', '--height': '100dvh' }}
    >
      <IonContent className={styles.content} scrollY={false}>
        <div className={styles.panel}>
          {!wizardData ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Cargando datos del plan...</p>
            </div>
          ) : (
            <div className={styles.panelInner}>

              {/* ── Top bar ── */}
              <div className={styles.topbar}>
                <div className={styles.topbarLeft}>
                  <BrandMark variant="monoline" size="md" />
                  <div className={styles.topbarCopy}>
                    <span className={styles.topbarEyebrow}>
                      {mode === 'crear' ? 'Tu primer plan' : mode === 'ajustar' ? 'Editando' : 'Plan de'}
                    </span>
                    <span className={styles.topbarTitle}>{formatMonthLabel(month)}</span>
                  </div>
                </div>
                <div className={styles.topbarRight}>
                  <button type="button" className={styles.topbarClose} onClick={onClose}>
                    <IonIcon icon={closeOutline} />
                  </button>
                </div>
              </div>

              {/* ── Stage ── */}
              <div className={styles.stage}>

                <PorAsignarHero
                  porAsignar={porAsignar}
                  totalIncome={totalIncome}
                  goalContribution={effectiveGoal}
                  totalPlanned={totalPlanned}
                />

                {effectiveGoal > 0 && (
                  <>
                    <div className={styles.secLabel}>
                      <span className={styles.secLabelText}>Lo primero · tu objetivo</span>
                      <span className={styles.secLabelHint}>bloqueado</span>
                    </div>
                    <GoalCard
                      amount={effectiveGoal}
                      label={goalLabel}
                      phase={goalPhase}
                      totalIncome={totalIncome}
                    />
                  </>
                )}

                <div className={styles.secLabel}>
                  <span className={styles.secLabelText}>Reparte el resto</span>
                  <span className={styles.secLabelHint}>toca para editar</span>
                </div>
                <div className={styles.catList}>
                  {categories.map((cat) => (
                    <CategoryFlatRow
                      key={cat.code}
                      cat={cat}
                      subcatAmounts={subcatAmounts}
                      totalIncome={totalIncome}
                      onClick={() => setFocusCode(cat.code)}
                    />
                  ))}
                </div>


                {mode === 'replantear' && (
                  <div className={styles.coachLine} style={{ margin: '14px 16px 0' }}>
                    <div className={styles.coachDot}>✦</div>
                    <div className={styles.coachText}>
                      Basado en tu historial. Tocá cualquier categoría para ajustar y firmar cuando estés listo.
                    </div>
                  </div>
                )}

              </div>

              {/* ── Dock ── */}
              <div className={styles.dock}>
                {mode === 'ajustar' && isWithinGraceWindow && changesCount > 0 ? (
                  <button type="button" className={`${styles.dockBtn} ${styles.dockZero}`} onClick={() => handleSave()}>
                    <IonIcon icon={checkmarkOutline} />
                    Guardar {changesCount} cambio{changesCount !== 1 ? 's' : ''}
                  </button>
                ) : mode === 'ajustar' ? (
                  <button type="button" className={`${styles.dockBtn} ${styles.dockSecondary}`} onClick={onClose}>
                    Cerrar
                  </button>
                ) : porAsignar > 0 ? (
                  <button type="button" className={`${styles.dockBtn} ${styles.dockPrimary}`} onClick={() => setLeftoverOpen(true)}>
                    <IonIcon icon={sparklesOutline} />
                    Ubicar {fmt(porAsignar)}
                  </button>
                ) : porAsignar < 0 ? (
                  <button type="button" className={`${styles.dockBtn} ${styles.dockOver}`} disabled>
                    Te pasaste {fmt(-porAsignar)} · ajustá alguna categoría
                  </button>
                ) : (
                  <button type="button" className={`${styles.dockBtn} ${styles.dockZero}`} onClick={() => handleSave()}>
                    <IonIcon icon={checkmarkOutline} />
                    {mode === 'replantear' ? 'Firmar plan' : 'Confirmar plan'}
                  </button>
                )}
              </div>

              {/* ── Overlays ── */}

              {showIntro && mode === 'crear' && (
                <WizardIntro
                  totalIncome={totalIncome}
                  onStart={() => setShowIntro(false)}
                  onClose={onClose}
                />
              )}

              {mode === 'crear' && !showIntro && (
                <WizardFlow
                  cats={categories}
                  goalContribution={effectiveGoal}
                  activeIndex={activeIndex}
                  porAsignar={porAsignar}
                  totalIncome={totalIncome}
                  subcatAmounts={subcatAmounts}
                  onSetSub={setSub}
                  onBack={() => {
                    if (activeIndex === 0) setShowIntro(true);
                    else setActiveIndex((i) => i - 1);
                  }}
                  onNext={() => {
                    if (activeIndex >= categories.length - 1) {
                      handleSave();
                    } else {
                      setActiveIndex((i) => i + 1);
                    }
                  }}
                  onClose={onClose}
                />
              )}

              {focusCat && mode !== 'crear' && (
                <FocusEditor
                  cat={focusCat}
                  subcatAmounts={subcatAmounts}
                  porAsignar={porAsignar}
                  totalIncome={totalIncome}
                  planLocked={mode === 'ajustar' && !isWithinGraceWindow}
                  onSetSub={setSub}
                  onClose={() => setFocusCode(null)}
                />
              )}

              {leftoverOpen && porAsignar > 0 && (
                <LeftoverSheet
                  amount={porAsignar}
                  goalLabel={goalLabel}
                  cats={categories}
                  subcatAmounts={subcatAmounts}
                  onGoal={addToGoal}
                  onCat={sendToCat}
                  onSplit={splitEvenly}
                  onKeep={() => setLeftoverOpen(false)}
                />
              )}

              {celebrate && (
                <Celebration
                  totalIncome={totalIncome}
                  onDone={() => {
                    setCelebrate(false);
                    handleSave();
                  }}
                />
              )}

            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
