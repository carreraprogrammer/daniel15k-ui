// BudgetWizardModal v2 — aligned with real backend architecture.
// Key changes vs v1:
//  · subcatAmounts (per subcategory code) replaces gavetaAmounts (per category)
//  · Gaveta is a navigable view (derived total), not a direct input
//  · Subcategories visible with source + confidence chips (SubcatRow)
//  · ModeCrear: step through categories, expanded view with low-confidence question block
//  · ModeReplantear: one gaveta expanded + rest collapsed
//  · ModeAjustar: focused category expanded with impact ripple
//  · buildPlanLines uses subcatAmounts directly (no proportional split)
import { useEffect, useState, type CSSProperties } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import type { BudgetLineItem, BudgetPlanDraft, WizardCategory, WizardData, WizardSubcategory } from '../../../types/finance.types';
import { BrandMark } from '../../atoms/BrandMark';
import { SubcatRow } from './SubcatRow';
import { CoachBubble } from './CoachBubble';
import { TradeOffCard } from './TradeOffCard';
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
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { c: string; s: string }> = {
  committed:     { c: '#C0392B', s: 'rgba(192,57,43,0.16)' },
  necessary:     { c: '#D4732A', s: 'rgba(212,115,42,0.16)' },
  discretionary: { c: '#C9980A', s: 'rgba(201,152,10,0.16)' },
  investment:    { c: '#1A9E4A', s: 'rgba(26,158,74,0.16)' },
  social:        { c: '#8A4FD8', s: 'rgba(138,79,216,0.16)' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
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

function buildSubcatInit(categories: WizardCategory[]): Record<string, number> {
  const init: Record<string, number> = {};
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      init[sub.code] = sub.suggested_amount;
    }
  }
  return init;
}

function buildPlanLines(categories: WizardCategory[], subcatAmounts: Record<string, number>): BudgetLineItem[] {
  const lines: BudgetLineItem[] = [];
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      const amt = subcatAmounts[sub.code] ?? 0;
      if (amt > 0) lines.push({ subcategory_code: sub.code, amount: amt });
    }
  }
  return lines;
}

function catTotal(cat: WizardCategory, subcatAmounts: Record<string, number>): number {
  return cat.subcategories.reduce((s, sub) => s + (subcatAmounts[sub.code] ?? 0), 0);
}

function toDisplaySource(sub: WizardSubcategory): string {
  const s = sub.source_of_truth ?? sub.source;
  if (!s) return 'benchmarks';
  if (s === 'recurring') return 'recurring_obligations';
  if (s === 'planned_expense') return 'planned_expenses';
  if (s === 'history') return 'transactions';
  if (s === 'benchmark') return 'benchmarks';
  return s;
}

function getCoachMessage(mode: WizardMode, cat: WizardCategory | null): string {
  if (mode === 'crear') {
    if (!cat) return 'Revisa el resumen antes de confirmar el plan.';
    const lockedCount = cat.subcategories.filter((s) => s.locked).length;
    const lowCount = cat.subcategories.filter((s) => s.confidence === 'low').length;
    if (cat.code === 'committed') {
      return lockedCount > 0
        ? `Encontré ${lockedCount} obligación${lockedCount !== 1 ? 'es' : ''} recurrente${lockedCount !== 1 ? 's' : ''} detectada${lockedCount !== 1 ? 's' : ''} automáticamente. El resto completalo con lo que ya prometiste.`
        : 'Lo que ya prometiste — arriendo, créditos, seguros. Esto no cambia mes a mes.';
    }
    if (lowCount > 0) {
      return `Armé ${cat.name.toLowerCase()} con lo que sé. Para ${lowCount} subcategoría${lowCount !== 1 ? 's' : ''} no tengo data tuya — usé un estimado de base. Ajustá si va alto o bajo.`;
    }
    return `Armé ${cat.name.toLowerCase()} con tu historial. Revisá que los montos van bien.`;
  }
  if (mode === 'replantear') {
    return 'Te propongo el plan basado en tu historial. Tocá cualquier gaveta para ver el desglose y firmar cuando estés listo.';
  }
  if (mode === 'ajustar' && cat) {
    return `Ajustá las subcategorías de ${cat.name.toLowerCase()}. Te muestro el impacto en tu colchón en tiempo real.`;
  }
  return '';
}

// ── GavetaExpandedLocal ────────────────────────────────────────────────────────

interface GavetaExpandedLocalProps {
  cat: WizardCategory;
  subcatAmounts: Record<string, number>;
  highlight?: boolean;
}

function GavetaExpandedLocal({ cat, subcatAmounts, highlight = false }: GavetaExpandedLocalProps) {
  const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E', s: 'rgba(122,110,94,0.16)' };
  const total = catTotal(cat, subcatAmounts);
  return (
    <div
      className={`${styles.gavetaExpanded} ${highlight ? styles.gavetaExpandedHighlight : ''}`}
      style={{ '--cat-c': col.c, '--cat-s': col.s } as CSSProperties}
    >
      <div className={styles.gavetaExpandedHeader}>
        <div className={styles.gavetaExpandedIcon}>{cat.name[0]?.toUpperCase()}</div>
        <div className={styles.gavetaExpandedMeta}>
          <div className={styles.gavetaExpandedName}>
            {cat.name}
            <span className={styles.gavetaExpandedSubCount}>· {cat.subcategories.length} sub</span>
          </div>
          <div className={styles.gavetaExpandedDesc}>{cat.description}</div>
        </div>
        <div className={styles.gavetaExpandedTotalCol}>
          <div className={styles.gavetaExpandedTotalAmt}>${fmtK(total)}</div>
          <div className={styles.gavetaExpandedTotalLabel}>suma de sub</div>
        </div>
      </div>
      <div>
        {cat.subcategories.map((sub) => (
          <SubcatRow
            key={sub.code}
            name={sub.name}
            amt={subcatAmounts[sub.code] ?? 0}
            source={toDisplaySource(sub)}
            confidence={sub.confidence}
            locked={sub.locked}
            hint={sub.edit_hint ?? null}
          />
        ))}
      </div>
    </div>
  );
}

// ── GavetaCollapsedRow ─────────────────────────────────────────────────────────

interface GavetaCollapsedRowProps {
  cat: WizardCategory;
  totalAmt: number;
  hint?: string;
  faded?: boolean;
  onClick?: () => void;
}

function GavetaCollapsedRow({ cat, totalAmt, hint, faded = false, onClick }: GavetaCollapsedRowProps) {
  const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E' };
  return (
    <button
      type="button"
      className={`${styles.gavetaCollapsed} ${faded ? styles.gavetaCollapsedFaded : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className={styles.gavetaCollapsedDot} style={{ background: col.c }} />
      <div className={styles.gavetaCollapsedCopy}>
        <span className={styles.gavetaCollapsedName}>
          {cat.name}
          <span className={styles.gavetaCollapsedSubCount}>· {cat.subcategories.length} sub</span>
        </span>
        {hint && <span className={styles.gavetaCollapsedHint}>{hint}</span>}
      </div>
      <span className={styles.gavetaCollapsedAmt}>${fmtK(totalAmt)}</span>
      {onClick && <span className={styles.gavetaCollapsedChevron}>›</span>}
    </button>
  );
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
  lowSubs: WizardSubcategory[];
  subcatAmounts: Record<string, number>;
  onSetAmount: (code: string, amount: number) => void;
}

function LowConfBlock({ lowSubs, subcatAmounts, onSetAmount }: LowConfBlockProps) {
  if (lowSubs.length === 0) return null;
  return (
    <div className={styles.lowConfBlock}>
      <div className={styles.lowConfTag}>
        {lowSubs.length === 1 ? '1 cosa que no sé' : `${lowSubs.length} cosas que no sé`}
      </div>
      {lowSubs.map((sub) => {
        const current = subcatAmounts[sub.code] ?? sub.suggested_amount;
        return (
          <div key={sub.code} className={styles.lowConfItem}>
            <div className={styles.lowConfQuestion}>
              ¿{sub.name} cómo va para ti?
            </div>
            <div className={styles.lowConfChips}>
              {LOW_CONF_MAGNITUDES.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className={`${styles.lowConfChip} ${current === m.amt ? styles.lowConfChipActive : ''}`}
                  onClick={() => onSetAmount(sub.code, m.amt)}
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

// ── TradeOff helpers ──────────────────────────────────────────────────────────

function buildTradeOffs(gap: number, categories: WizardCategory[], subcatAmounts: Record<string, number>) {
  const getTotal = (code: string) =>
    catTotal(categories.find((c) => c.code === code) ?? ({ subcategories: [] } as unknown as WizardCategory), subcatAmounts);

  const discTotal = getTotal('discretionary');
  const socialTotal = getTotal('social');
  const investTotal = getTotal('investment');

  const scaleCategory = (code: string, factor: number): Record<string, number> => {
    const cat = categories.find((c) => c.code === code);
    if (!cat) return {};
    const result: Record<string, number> = {};
    for (const sub of cat.subcategories) {
      if (!sub.locked) result[sub.code] = Math.round((subcatAmounts[sub.code] ?? 0) * factor);
    }
    return result;
  };

  return [
    {
      tag: 'Camino A',
      title: 'Reducir Discrecional y Social este mes',
      body: `Cortamos ${fmtK(Math.round(discTotal * 0.3))} de elección y ${fmtK(Math.round(socialTotal * 0.3))} de social. Cubrimos sin tocar lo importante.`,
      cost: '1 mes ajustado',
      color: '#C9980A',
      action: () => ({ ...scaleCategory('discretionary', 0.7), ...scaleCategory('social', 0.7) }),
    },
    {
      tag: 'Camino B',
      title: 'Reducir meta de inversión este mes',
      body: `Bajamos la meta de inversión ${fmtK(Math.round(investTotal * 0.4))} por este mes. Cubrís el gap sin tocar gastos de vida.`,
      cost: 'un mes sin avanzar en meta',
      color: '#8A4FD8',
      action: () => scaleCategory('investment', 0.6),
    },
    {
      tag: 'Camino C',
      title: 'Buscar ingreso extra este mes',
      body: `Necesitás ${fmtK(gap)} extra. Un freelance, hora extra, o adelantar cobro pendiente podría cubrir el gap.`,
      cost: 'esfuerzo extra',
      color: '#0E96AD',
      action: () => ({}),
    },
  ];
}

// ── Component ──────────────────────────────────────────────────────────────────

export const BudgetWizardModal = ({
  isOpen, onClose, onComplete, wizardData, month,
  hasPlanHistory = false, isEditMode = false,
  adjustCategoryCode, existingMode,
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
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!wizardData) return;
    setSubcatAmounts(buildSubcatInit(wizardData.categories));
    setActiveIndex(0);
    if (mode === 'replantear' && wizardData.categories.length > 0) {
      setExpandedCode(wizardData.categories[0].code);
    }
  }, [wizardData, mode]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalPlanned = categories.reduce((s, cat) => s + catTotal(cat, subcatAmounts), 0);
  const colchon = Math.max(0, totalIncome - totalPlanned);
  const noAlcanza = totalIncome > 0 && totalPlanned > totalIncome * 1.02;
  const gap = Math.max(0, totalPlanned - totalIncome);

  const focusedCode = adjustCategoryCode ?? categories[0]?.code ?? '';
  const focusedCategory = categories.find((c) => c.code === focusedCode) ?? categories[0] ?? null;
  const focusedTotal = focusedCategory ? catTotal(focusedCategory, subcatAmounts) : 0;
  const focusedPrior = focusedCategory?.suggested_total ?? 0;

  const setSub = (code: string, amt: number) =>
    setSubcatAmounts((prev) => ({ ...prev, [code]: Math.max(0, amt) }));

  const handleSave = (overrideAmounts?: Record<string, number>) => {
    if (!wizardData) return;
    const amounts = overrideAmounts ?? subcatAmounts;
    const lines = buildPlanLines(categories, amounts);
    onComplete({ month, total_income: totalIncome, lines, mode: existingMode ?? 'expected' });
  };

  const confirmAndAdvance = () => {
    if (mode === 'crear') {
      if (activeIndex < categories.length - 1) {
        setActiveIndex((i) => i + 1);
      } else {
        handleSave();
      }
    } else {
      handleSave();
    }
  };

  const activeCategory = categories[activeIndex] ?? null;
  const isOnLastStep = mode === 'crear' && activeIndex >= categories.length - 1;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <IonModal
      className={styles.modal}
      isOpen={isOpen}
      onDidDismiss={onClose}
      keepContentsMounted
      style={{ '--border-radius': '0px', '--width': '100vw', '--height': '100dvh' }}
    >
      <IonContent className={styles.content}>
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
                      {mode === 'crear' ? 'Tu primer plan' : mode === 'ajustar' ? 'Ajustando' : 'Plan de'}
                    </span>
                    <span className={styles.topbarTitle}>{formatMonthLabel(month)}</span>
                  </div>
                </div>
                <div className={styles.topbarRight}>
                  {mode === 'crear' && (
                    <span className={styles.stepPill}>
                      {Math.min(activeIndex + 1, categories.length)} de {categories.length}
                    </span>
                  )}
                  {mode === 'replantear' && (
                    <span className={styles.modePillBrand}>historial</span>
                  )}
                  {noAlcanza && (
                    <span className={styles.modePillWarn}>● desbalance</span>
                  )}
                  <button type="button" onClick={onClose} className={styles.closeBtn}>
                    Cerrar
                  </button>
                </div>
              </div>

              {/* ── Scrollable stage ── */}
              <div className={styles.stage}>

                {/* ── NoAlcanza ── */}
                {noAlcanza && mode !== 'ajustar' ? (
                  <div className={styles.gavetas}>
                    <CoachBubble tone="tense">
                      Te quedan <strong>${fmtK(gap)} cortos</strong> este mes con el plan propuesto.
                      No es un drama, es un nudo. Tengo 3 caminos —{' '}
                      <strong>vos elegís</strong>, yo no decido por vos.
                    </CoachBubble>

                    <div className={styles.balanceBar}>
                      <div className={styles.balanceRow}>
                        <span className={styles.balanceLabel}>Lo que entra</span>
                        <span className={styles.balanceValueGood}>${fmtK(totalIncome)}</span>
                      </div>
                      <div className={styles.balanceRow}>
                        <span className={styles.balanceLabel}>Lo que planeaste gastar</span>
                        <span className={styles.balanceValueNeutral}>${fmtK(totalPlanned)}</span>
                      </div>
                      <div className={styles.balanceTrack}>
                        <div className={styles.balanceIncome} style={{ width: `${Math.round((totalIncome / totalPlanned) * 100)}%` }} />
                        <div
                          className={styles.balanceGap}
                          style={{ left: `${Math.round((totalIncome / totalPlanned) * 100)}%` }}
                        >
                          <span className={styles.balanceGapLabel}>−${fmtK(gap)}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.tradeOffHeader}>
                      <span className={styles.sectionLabel}>3 caminos</span>
                      <span className={styles.sectionHint}>cada uno tiene un costo</span>
                    </div>
                    <div className={styles.tradeOffs}>
                      {buildTradeOffs(gap, categories, subcatAmounts).map((t) => (
                        <TradeOffCard
                          key={t.tag}
                          tag={t.tag}
                          title={t.title}
                          body={t.body}
                          cost={t.cost}
                          color={t.color}
                          onChoose={() => {
                            const adjustments = t.action();
                            const newAmounts = { ...subcatAmounts, ...adjustments };
                            setSubcatAmounts(newAmounts);
                            handleSave(newAmounts);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                ) : mode === 'crear' ? (
                  /* ── ModeCrear v2: step through categories, expanded view ── */
                  <div className={styles.gavetas}>
                    {activeCategory && (
                      <CoachBubble>
                        {getCoachMessage('crear', activeCategory)}
                      </CoachBubble>
                    )}

                    <div className={styles.totalsStrip}>
                      <span className={styles.totalStripLabel}>Llevas en gavetas</span>
                      <span className={styles.totalStripValue}>
                        ${fmtK(totalPlanned)}
                        {totalIncome > 0 && ` de $${fmtK(totalIncome)}`}
                      </span>
                    </div>

                    <div className={styles.gavetaStack}>
                      {categories.map((cat, i) => {
                        const total = catTotal(cat, subcatAmounts);

                        if (i === activeIndex) {
                          const lowSubs = cat.subcategories.filter((s) => s.confidence === 'low');
                          return (
                            <div key={cat.code} className={styles.gavetaCrearActive}>
                              <GavetaExpandedLocal
                                cat={cat}
                                subcatAmounts={subcatAmounts}
                                highlight
                              />
                              {lowSubs.length > 0 && (
                                <LowConfBlock
                                  lowSubs={lowSubs}
                                  subcatAmounts={subcatAmounts}
                                  onSetAmount={setSub}
                                />
                              )}
                            </div>
                          );
                        }

                        if (i < activeIndex) {
                          return (
                            <GavetaCollapsedRow
                              key={cat.code}
                              cat={cat}
                              totalAmt={total}
                              hint="confirmado"
                              onClick={() => setActiveIndex(i)}
                            />
                          );
                        }

                        return (
                          <GavetaCollapsedRow
                            key={cat.code}
                            cat={cat}
                            totalAmt={0}
                            faded
                          />
                        );
                      })}
                    </div>
                  </div>

                ) : mode === 'replantear' ? (
                  /* ── ModeReplantear v2: plan summary + expanded/collapsed gavetas ── */
                  <div className={styles.gavetas}>
                    <CoachBubble>
                      {getCoachMessage('replantear', null)}
                    </CoachBubble>

                    <div className={styles.planSummary}>
                      <div>
                        <div className={styles.planSummaryLabel}>Plan</div>
                        <div className={styles.planSummaryValue}>${fmtK(totalPlanned)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={styles.planSummaryLabel}>Colchón</div>
                        <div className={`${styles.planSummaryValue} ${styles.planColchon}`}>
                          ${fmtK(colchon)}
                        </div>
                      </div>
                    </div>

                    <div className={styles.gavetaStack}>
                      {categories.map((cat) => {
                        const total = catTotal(cat, subcatAmounts);
                        const isExpanded = expandedCode === cat.code;
                        if (isExpanded) {
                          return (
                            <div key={cat.code}>
                              <GavetaExpandedLocal
                                cat={cat}
                                subcatAmounts={subcatAmounts}
                                highlight
                              />
                              <button
                                type="button"
                                className={styles.collapseBtn}
                                onClick={() => setExpandedCode(null)}
                              >
                                Colapsar
                              </button>
                            </div>
                          );
                        }
                        return (
                          <GavetaCollapsedRow
                            key={cat.code}
                            cat={cat}
                            totalAmt={total}
                            onClick={() => setExpandedCode(cat.code)}
                          />
                        );
                      })}
                    </div>
                  </div>

                ) : (
                  /* ── ModeAjustar v2: focused category expanded ── */
                  <div className={styles.gavetas}>
                    {focusedCategory && (
                      <CoachBubble>
                        {getCoachMessage('ajustar', focusedCategory)}
                      </CoachBubble>
                    )}

                    {focusedCategory && (
                      <div className={styles.ripple}>
                        <span className={styles.rippleDot} />
                        <div className={styles.rippleText}>
                          {focusedTotal > focusedPrior
                            ? <>Subís ${fmtK(focusedTotal - focusedPrior)} sobre el plan. Colchón: <strong>${fmtK(colchon)}</strong>.</>
                            : focusedTotal < focusedPrior
                              ? <>Liberás ${fmtK(focusedPrior - focusedTotal)}. Colchón: <strong>${fmtK(colchon)}</strong>.</>
                              : <>Sin cambio. Colchón: <strong>${fmtK(colchon)}</strong>.</>}
                        </div>
                      </div>
                    )}

                    {focusedCategory && (
                      <GavetaExpandedLocal
                        cat={focusedCategory}
                        subcatAmounts={subcatAmounts}
                        highlight
                      />
                    )}

                    <div className={styles.planRestLabel}>El resto del plan, intacto</div>
                    <div className={styles.planRestList}>
                      {categories
                        .filter((c) => c.code !== focusedCode)
                        .map((cat) => {
                          const col = CAT_COLORS[cat.code] ?? { c: '#7A6E5E' };
                          const total = catTotal(cat, subcatAmounts);
                          return (
                            <div key={cat.code} className={styles.planRestItem}>
                              <span className={styles.planRestDot} style={{ background: col.c }} />
                              <span className={styles.planRestName}>{cat.name}</span>
                              <span className={styles.planRestAmt}>${fmtK(total)}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Bottom composer ── */}
              <div className={styles.composer}>
                {!noAlcanza && (
                  <button
                    type="button"
                    className={styles.composerCta}
                    onClick={confirmAndAdvance}
                    disabled={!wizardData}
                  >
                    {mode === 'ajustar'
                      ? 'Guardar ajuste'
                      : mode === 'replantear'
                        ? 'Firmar plan'
                        : isOnLastStep
                          ? 'Confirmar plan'
                          : 'Confirmar y seguir →'}
                  </button>
                )}
                <div className={styles.composerInput}>
                  <input
                    type="text"
                    className={styles.composerTextField}
                    placeholder={
                      mode === 'ajustar'
                        ? 'O dile al coach el motivo…'
                        : mode === 'replantear'
                          ? 'Pedí cambios al plan…'
                          : 'O escribime un estimado…'
                    }
                    readOnly
                  />
                  <div className={styles.composerSend}>↑</div>
                </div>
              </div>

            </div>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
