import { useEffect, useState, type CSSProperties } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import type { BudgetLineItem, BudgetPlanDraft, WizardCategory, WizardData } from '../../../types/finance.types';
import { BrandMark } from '../../atoms/BrandMark';
import { GavetaCard, CATEGORY_COLORS } from './GavetaCard';
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

function fmtCOP(n: number): string {
  return Math.round(n).toLocaleString('es-CO');
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

function buildGavetaInit(categories: WizardCategory[], mode: WizardMode): Record<string, number> {
  const init: Record<string, number> = {};
  for (const cat of categories) {
    init[cat.code] = mode === 'crear' ? 0 : cat.suggested_total;
  }
  return init;
}

function buildPlanLines(categories: WizardCategory[], gavetaAmounts: Record<string, number>): BudgetLineItem[] {
  const lines: BudgetLineItem[] = [];
  for (const cat of categories) {
    const totalAmt = gavetaAmounts[cat.code] ?? 0;
    if (totalAmt <= 0) continue;
    const subs = cat.subcategories;
    const totalSugg = subs.reduce((s, sub) => s + sub.suggested_amount, 0);
    if (subs.length === 0) continue;
    for (const sub of subs) {
      const subAmt = totalSugg > 0
        ? Math.round((sub.suggested_amount / totalSugg) * totalAmt)
        : Math.round(totalAmt / subs.length);
      if (subAmt > 0) lines.push({ subcategory_code: sub.code, amount: subAmt });
    }
  }
  return lines;
}

function getCoachMessage(mode: WizardMode, cat: WizardCategory | null, activeIndex: number, total: number): string {
  if (mode === 'crear') {
    if (!cat) return 'Revisa el resumen antes de confirmar el plan.';
    if (activeIndex === 0) return 'Empecemos con lo que ya está comprometido — arriendo, créditos, seguros. Esto no cambia mes a mes.';
    if (cat.code === 'necessary') return 'Sigamos con lo que cubre tu vida diaria — mercado, transporte, salud. No tiene que ser exacto, lo afinamos con tu data real.';
    if (cat.code === 'discretionary') return 'Tu zona de elección. Aquí tenés control total sobre cuánto reservar.';
    if (cat.code === 'investment') return '¿Qué vas a construir este mes? Ahorro, cursos, futuro. Aunque sea un poco cuenta.';
    if (cat.code === 'social') return 'Salidas, regalos, lo que te conecta con otros. Que no sea cero.';
    return `¿Cuánto reservás para ${cat.name.toLowerCase()} este mes?`;
  }
  if (mode === 'replantear') {
    return 'Te propongo el plan basado en tu historial. Aceptás todo o tocás para ajustar.';
  }
  if (mode === 'ajustar') {
    if (cat) return `Ajustá el monto de ${cat.name.toLowerCase()}. Te muestro el impacto en tu colchón al instante.`;
  }
  return '';
}

const CATEGORY_HINTS: Record<string, string[]> = {
  committed:     ['Calculado automático', '−$100K', '+$100K'],
  necessary:     ['Solo lo básico', 'Estándar ciudad', 'Algo extra'],
  discretionary: ['Mínimo', 'Mi promedio', 'Mes especial'],
  investment:    ['Sin monto', 'Algo', 'Mi meta'],
  social:        ['Lo mínimo', 'Activo social'],
};

// ── No-alcanza trade-off data ──────────────────────────────────────────────────

function buildTradeOffs(gap: number, categories: WizardCategory[], gavetaAmounts: Record<string, number>) {
  const discAmt = gavetaAmounts['discretionary'] ?? 0;
  const socialAmt = gavetaAmounts['social'] ?? 0;
  const investAmt = gavetaAmounts['investment'] ?? 0;
  const cutDiscSocial = Math.min(discAmt * 0.4 + socialAmt * 0.4, gap);
  return [
    {
      tag: 'Camino A',
      title: 'Reducir Discrecional y Social este mes',
      body: `Cortamos ${fmtK(Math.round(discAmt * 0.3))} de elección y ${fmtK(Math.round(socialAmt * 0.3))} de social. Cubrimos sin tocar lo importante.`,
      cost: '1 mes ajustado',
      color: '#C9980A',
      action: () => ({
        discretionary: Math.round(discAmt * 0.7),
        social: Math.round(socialAmt * 0.7),
      }),
    },
    {
      tag: 'Camino B',
      title: 'Reducir meta de inversión este mes',
      body: `Bajamos la meta de inversión ${fmtK(Math.round(investAmt * 0.4))} por este mes. Cubrís el gap sin tocar gastos de vida.`,
      cost: 'un mes sin avanzar en meta',
      color: '#8A4FD8',
      action: () => ({
        investment: Math.round(investAmt * 0.6),
      }),
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
  isOpen,
  onClose,
  onComplete,
  wizardData,
  month,
  hasPlanHistory = false,
  isEditMode = false,
  adjustCategoryCode,
  existingMode,
}: BudgetWizardModalProps) => {
  const incomeNeedsSetup = wizardData?.income.needs_setup === true;
  const mode = detectMode(hasPlanHistory, isEditMode, incomeNeedsSetup);
  const categories = wizardData?.categories ?? [];
  const totalIncome = wizardData?.income.suggested_total ?? 0;
  const totalExpenses = categories.reduce((s, c) => s + c.suggested_total, 0);
  const noAlcanza = totalIncome > 0 && totalExpenses > totalIncome * 1.02;
  const gap = Math.max(0, totalExpenses - totalIncome);

  // Gaveta amounts — one per category
  const [gavetaAmounts, setGavetaAmounts] = useState<Record<string, number>>({});
  // Step for ModeCrear (0 = first category, categories.length = summary)
  const [activeIndex, setActiveIndex] = useState(0);
  // Which category is focused in ModeAjustar
  const focusedCode = adjustCategoryCode ?? categories[0]?.code ?? '';
  // Local text input value for the active card in ModeCrear
  const [inputRaw, setInputRaw] = useState('');

  useEffect(() => {
    if (!wizardData) return;
    const init = buildGavetaInit(wizardData.categories, mode);
    setGavetaAmounts(init);
    setActiveIndex(0);
  }, [wizardData, mode]);

  // Sync input field when active category changes
  useEffect(() => {
    if (mode !== 'crear' || !categories[activeIndex]) return;
    const code = categories[activeIndex].code;
    const amt = gavetaAmounts[code] ?? 0;
    setInputRaw(amt > 0 ? String(Math.round(amt)) : '');
  }, [activeIndex, mode]);

  const setAmount = (code: string, amt: number) => {
    setGavetaAmounts((prev) => ({ ...prev, [code]: Math.max(0, amt) }));
  };

  const handleSave = () => {
    if (!wizardData) return;
    const lines = buildPlanLines(categories, gavetaAmounts);
    const draft: BudgetPlanDraft = {
      month,
      total_income: totalIncome,
      lines,
      mode: existingMode ?? 'expected',
    };
    onComplete(draft);
  };

  const confirmAndAdvance = () => {
    let finalAmounts = gavetaAmounts;
    if (mode === 'crear' && categories[activeIndex]) {
      const code = categories[activeIndex].code;
      const parsed = Number(inputRaw.replace(/\./g, '').replace(',', '.'));
      if (!Number.isNaN(parsed)) {
        finalAmounts = { ...gavetaAmounts, [code]: Math.max(0, parsed) };
        setGavetaAmounts(finalAmounts);
      }
    }
    if (activeIndex < categories.length - 1) {
      setActiveIndex((i) => i + 1);
    } else {
      // Use finalAmounts directly to avoid state lag on last step
      if (!wizardData) return;
      const lines = buildPlanLines(categories, finalAmounts);
      onComplete({ month, total_income: totalIncome, lines, mode: existingMode ?? 'expected' });
    }
  };

  const activeCategory = categories[activeIndex] ?? null;
  const focusedCategory = categories.find((c) => c.code === focusedCode) ?? categories[0] ?? null;
  const focusedAmt = gavetaAmounts[focusedCode] ?? 0;
  const focusedMax = Math.round((focusedAmt + totalIncome * 0.15) / 50_000) * 50_000;
  const priorAmt = focusedCategory?.suggested_total ?? 0;

  const totalPlanned = Object.values(gavetaAmounts).reduce((s, v) => s + v, 0);
  const colchon = Math.max(0, totalIncome - totalPlanned);

  const isOnLastStep = mode === 'crear' && activeIndex >= categories.length - 1;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <IonModal
      className={styles.modal}
      isOpen={isOpen}
      onDidDismiss={onClose}
      keepContentsMounted
      style={{
        '--border-radius': '0px',
        '--width': '100vw',
        '--height': '100dvh',
      }}
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

              {/* ── Scrollable body ── */}
              <div className={styles.stage}>

                {/* ── NoAlcanza: show trade-off cards when income < expenses ── */}
                {noAlcanza && mode !== 'ajustar' ? (
                  <div className={styles.gavetas}>
                    <CoachBubble tone="tense">
                      Te quedan <strong>${fmtK(gap)} cortos</strong> este mes con el plan propuesto.
                      No es un drama, es un nudo. Tengo 3 caminos —{' '}
                      <strong>vos elegís</strong>, yo no decido por vos.
                    </CoachBubble>

                    {/* Income vs expenses bar */}
                    <div className={styles.balanceBar}>
                      <div className={styles.balanceRow}>
                        <span className={styles.balanceLabel}>Lo que entra</span>
                        <span className={styles.balanceValueGood}>${fmtK(totalIncome)}</span>
                      </div>
                      <div className={styles.balanceRow}>
                        <span className={styles.balanceLabel}>Lo que planeaste gastar</span>
                        <span className={styles.balanceValueNeutral}>${fmtK(totalExpenses)}</span>
                      </div>
                      <div className={styles.balanceTrack}>
                        <div className={styles.balanceIncome} style={{ width: `${Math.round((totalIncome / totalExpenses) * 100)}%` }} />
                        <div
                          className={styles.balanceGap}
                          style={{ left: `${Math.round((totalIncome / totalExpenses) * 100)}%` }}
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
                      {buildTradeOffs(gap, categories, gavetaAmounts).map((t) => (
                        <TradeOffCard
                          key={t.tag}
                          tag={t.tag}
                          title={t.title}
                          body={t.body}
                          cost={t.cost}
                          color={t.color}
                          onChoose={() => {
                            const adjustments = t.action();
                            setGavetaAmounts((prev) => ({ ...prev, ...adjustments }));
                            handleSave();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : mode === 'crear' ? (
                  /* ── ModeCrear: step through categories ── */
                  <div className={styles.gavetas}>
                    {activeCategory && (
                      <CoachBubble>
                        {getCoachMessage('crear', activeCategory, activeIndex, totalIncome)}
                      </CoachBubble>
                    )}

                    <div className={styles.gavetaStack}>
                      {categories.map((cat, i) => {
                        if (i < activeIndex) {
                          // Locked (already filled)
                          return (
                            <GavetaCard
                              key={cat.code}
                              code={cat.code}
                              name={cat.name}
                              hint={cat.description}
                              amt={gavetaAmounts[cat.code] ?? 0}
                              state="locked"
                              onClick={() => setActiveIndex(i)}
                            />
                          );
                        }

                        if (i === activeIndex) {
                          // Active card — expanded
                          const col = CATEGORY_COLORS[cat.code] ?? { c: '#7A6E5E', s: 'rgba(122,110,94,0.16)' };
                          const currentAmt = gavetaAmounts[cat.code] ?? 0;
                          const pct = totalIncome > 0 ? Math.round((currentAmt / totalIncome) * 100) : 0;
                          const chips = CATEGORY_HINTS[cat.code] ?? ['Mi promedio', '−$100K', '+$100K'];

                          return (
                            <div
                              key={cat.code}
                              className={styles.activeCard}
                              style={{ '--cat-c': col.c, '--cat-s': col.s } as CSSProperties}
                            >
                              <div className={styles.activeCardHeader}>
                                <div className={styles.activeCardIcon}>{cat.name[0]?.toUpperCase()}</div>
                                <div>
                                  <div className={styles.activeCardName}>{cat.name}</div>
                                  <div className={styles.activeCardDesc}>{cat.description}</div>
                                </div>
                              </div>

                              <div className={styles.activeCardQuestion}>
                                ¿Cuánto reservás para{' '}
                                <span style={{ color: col.c }}>{cat.name.toLowerCase()}</span> este mes?
                              </div>
                              <div className={styles.activeCardNote}>
                                No tiene que ser exacto. Lo afinamos con tu data real.
                              </div>

                              <div className={styles.activeCardInput}>
                                <span className={styles.activeCardCurrency}>$</span>
                                <input
                                  type="number"
                                  value={inputRaw}
                                  placeholder={cat.suggested_total > 0 ? fmtCOP(cat.suggested_total) : '0'}
                                  className={styles.activeCardAmountInput}
                                  onChange={(e) => {
                                    setInputRaw(e.target.value);
                                    const n = Number(e.target.value);
                                    if (!Number.isNaN(n)) setAmount(cat.code, n);
                                  }}
                                  aria-label={`Monto para ${cat.name}`}
                                />
                                {pct > 0 && (
                                  <span className={styles.activeCardPct}>~{pct}%</span>
                                )}
                              </div>

                              <div className={styles.activeCardChips}>
                                {cat.suggested_total > 0 && (
                                  <button
                                    type="button"
                                    className={styles.activeChip}
                                    onClick={() => {
                                      setAmount(cat.code, cat.suggested_total);
                                      setInputRaw(String(Math.round(cat.suggested_total)));
                                    }}
                                  >
                                    Sugerido ${fmtK(cat.suggested_total)}
                                  </button>
                                )}
                                {chips.map((chip) => (
                                  <button
                                    key={chip}
                                    type="button"
                                    className={styles.activeChip}
                                    onClick={() => {
                                      const delta = chip.startsWith('−') ? -100_000 : chip.startsWith('+') ? 100_000 : 0;
                                      if (delta !== 0) {
                                        const next = Math.max(0, (gavetaAmounts[cat.code] ?? 0) + delta);
                                        setAmount(cat.code, next);
                                        setInputRaw(String(Math.round(next)));
                                      }
                                    }}
                                  >
                                    {chip}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        // Pending (not yet reached)
                        return (
                          <GavetaCard
                            key={cat.code}
                            code={cat.code}
                            name={cat.name}
                            hint={cat.description}
                            amt={0}
                            state="empty"
                            faded
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : mode === 'replantear' ? (
                  /* ── ModeReplantear: all pre-filled ── */
                  <div className={styles.gavetas}>
                    <CoachBubble>
                      {getCoachMessage('replantear', null, 0, totalIncome)}
                    </CoachBubble>

                    <div className={styles.planSummary}>
                      <div>
                        <div className={styles.planSummaryLabel}>Plan total</div>
                        <div className={styles.planSummaryValue}>${fmtK(totalPlanned)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className={styles.planSummaryLabel}>Colchón</div>
                        <div className={[styles.planSummaryValue, styles.planColchon].join(' ')}>
                          ${fmtK(colchon)}
                        </div>
                      </div>
                    </div>

                    <div className={styles.gavetaStack}>
                      {categories.map((cat) => (
                        <GavetaCard
                          key={cat.code}
                          code={cat.code}
                          name={cat.name}
                          hint={cat.description}
                          amt={gavetaAmounts[cat.code] ?? cat.suggested_total}
                          state="filled"
                          onClick={() => {
                            // Allow tapping to adjust
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── ModeAjustar: focused single category ── */
                  <div className={styles.gavetas}>
                    {focusedCategory && (
                      <CoachBubble>
                        {getCoachMessage('ajustar', focusedCategory, 0, totalIncome)}
                      </CoachBubble>
                    )}

                    {focusedCategory && (
                      <GavetaCard
                        code={focusedCategory.code}
                        name={focusedCategory.name}
                        hint={focusedCategory.description}
                        amt={focusedAmt}
                        state="highlighted"
                        showSlider
                        sliderMax={focusedMax || 1_500_000}
                        prior={priorAmt}
                        onSliderChange={(v) => setAmount(focusedCode, v)}
                      />
                    )}

                    {/* Live impact ripple */}
                    {focusedCategory && (
                      <div className={styles.ripple}>
                        <span className={styles.rippleDot} />
                        <div className={styles.rippleText}>
                          {focusedAmt > priorAmt ? (
                            <>Subís ${fmtK(focusedAmt - priorAmt)} sobre el plan. Tu colchón cae a{' '}
                              <strong>${fmtK(Math.max(0, colchon))}</strong>.</>
                          ) : focusedAmt < priorAmt ? (
                            <>Liberás ${fmtK(priorAmt - focusedAmt)}. Colchón: <strong>${fmtK(Math.max(0, colchon))}</strong>.</>
                          ) : (
                            <>Sin cambio. Colchón actual: <strong>${fmtK(Math.max(0, colchon))}</strong>.</>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rest of plan dimmed */}
                    <div className={styles.planRestLabel}>El resto del plan, intacto</div>
                    <div className={styles.planRestList}>
                      {categories
                        .filter((c) => c.code !== focusedCode)
                        .map((cat) => {
                          const col = CATEGORY_COLORS[cat.code] ?? { c: '#7A6E5E' };
                          return (
                            <div key={cat.code} className={styles.planRestItem}>
                              <span className={styles.planRestDot} style={{ background: col.c }} />
                              <span className={styles.planRestName}>{cat.name}</span>
                              <span className={styles.planRestAmt}>${fmtK(gavetaAmounts[cat.code] ?? 0)}</span>
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
                    onClick={mode === 'ajustar' ? handleSave : mode === 'replantear' ? handleSave : confirmAndAdvance}
                    disabled={!wizardData}
                  >
                    {mode === 'ajustar'
                      ? 'Guardar ajuste'
                      : mode === 'replantear'
                        ? 'Aceptar y firmar plan'
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
