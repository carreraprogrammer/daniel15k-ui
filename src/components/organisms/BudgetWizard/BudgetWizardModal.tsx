import { useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type {
  BudgetLineItem,
  BudgetPlanDraft,
  WizardCategory,
  WizardData,
  WizardSubcategory,
} from '../../../types/finance.types';
import { BudgetIncomeStep } from './BudgetIncomeStep';
import { BudgetCategoryStep } from './BudgetCategoryStep';
import { BudgetSummaryStep } from './BudgetSummaryStep';
import { AddSubcategorySheet } from './AddSubcategorySheet';
import styles from './BudgetWizardModal.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Step sequence:
 *  0 — Ingreso (income anchor)
 *  1 — Comprometido
 *  2 — Necesario
 *  3 — Inversión
 *  4 — Social
 *  5 — Discrecional
 *  6 — Resumen
 */
const TOTAL_STEPS = 7; // 0..6
const CATEGORY_STEP_FIRST = 1;
const CATEGORY_STEP_LAST  = 5;
const SUMMARY_STEP = 6;

// Progress dots only count category steps (1–5)
const PROGRESS_STEP_COUNT = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

interface BudgetWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (planData: BudgetPlanDraft) => void;
  wizardData?: WizardData;
  month: string; // e.g. "2026-05"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build initial stepData from wizardData suggested amounts */
function buildInitialStepData(
  wizardData: WizardData,
): Record<string, Record<string, number>> {
  const data: Record<string, Record<string, number>> = {};
  for (const cat of wizardData.categories) {
    data[cat.code] = {};
    for (const sub of cat.subcategories) {
      data[cat.code][sub.code] = sub.suggested_amount;
    }
  }
  return data;
}

/** Build initial income source amounts from wizardData */
function buildInitialIncomeSources(
  wizardData: WizardData,
): number[] {
  return wizardData.income.sources.map((s) => s.monthly_amount);
}

/** Category at a given step (steps 1–5 → index 0–4) */
function categoryForStep(
  step: number,
  categories: WizardCategory[],
): WizardCategory | null {
  if (step < CATEGORY_STEP_FIRST || step > CATEGORY_STEP_LAST) return null;
  return categories[step - 1] ?? null;
}

/**
 * Compute the "alreadyCommitted" total for a category step:
 * sum of all categories BEFORE this step.
 * Uses the merged subcategory list so locally added subs are counted.
 */
function computeAlreadyCommitted(
  currentStep: number,
  categories: WizardCategory[],
  stepData: Record<string, Record<string, number>>,
  localSubcategories: Record<string, WizardSubcategory[]>,
): number {
  let total = 0;
  for (let s = CATEGORY_STEP_FIRST; s < currentStep; s++) {
    const cat = categories[s - 1];
    if (!cat) continue;
    const subAmounts = stepData[cat.code] ?? {};
    const mergedSubs = [...cat.subcategories, ...(localSubcategories[cat.code] ?? [])];
    for (const sub of mergedSubs) {
      total += subAmounts[sub.code] ?? sub.suggested_amount;
    }
  }
  return total;
}

/** Step title for the toolbar */
function stepTitle(step: number, categories: WizardCategory[]): string {
  if (step === 0) return 'Ingreso';
  if (step === SUMMARY_STEP) return 'Resumen';
  const cat = categoryForStep(step, categories);
  return cat ? cat.name : `Paso ${step}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BudgetWizardModal = ({
  isOpen,
  onClose,
  onComplete,
  wizardData,
  month,
}: BudgetWizardModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, Record<string, number>>>({});
  const [incomeSources, setIncomeSources] = useState<number[]>([]);
  const [includeVariable, setIncludeVariable] = useState(true);

  // ── Subcategory sheet state ────────────────────────────────────────────────
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addSubCategory, setAddSubCategory] = useState<WizardCategory | null>(null);
  /**
   * Locally created subcategories, keyed by category code.
   * These are merged at render time so new subs appear instantly.
   */
  const [localSubcategories, setLocalSubcategories] =
    useState<Record<string, WizardSubcategory[]>>({});

  // Pre-populate from wizardData on mount or when data arrives
  useEffect(() => {
    if (!wizardData) return;
    setStepData(buildInitialStepData(wizardData));
    setIncomeSources(buildInitialIncomeSources(wizardData));
  }, [wizardData]);

  // Reset step to 0 every time modal opens
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const categories = wizardData?.categories ?? [];

  const totalIncome = wizardData
    ? incomeSources.reduce((sum, amt, i) => {
        const source = wizardData.income.sources[i];
        if (!includeVariable && source?.is_variable) return sum;
        return sum + amt;
      }, 0)
    : 0;

  const alreadyCommitted = computeAlreadyCommitted(
    currentStep,
    categories,
    stepData,
    localSubcategories,
  );

  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === SUMMARY_STEP;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleIncomeChange = (sourceIndex: number, amount: number) => {
    setIncomeSources((prev) => {
      const next = [...prev];
      next[sourceIndex] = amount;
      return next;
    });
  };

  const handleAmountChange = (categoryCode: string, subcategoryCode: string, amount: number) => {
    setStepData((prev) => ({
      ...prev,
      [categoryCode]: {
        ...(prev[categoryCode] ?? {}),
        [subcategoryCode]: amount,
      },
    }));
  };

  /**
   * Called by AddSubcategorySheet on successful creation.
   * Merges the new subcategory into localSubcategories and seeds
   * its stepData entry to $0 so it appears immediately with a low-confidence dot.
   */
  const handleSubcategoryCreated = (sub: { code: string; name: string; icon: string }) => {
    if (!addSubCategory) return;

    const newSub: WizardSubcategory = {
      code: sub.code,
      name: sub.name,
      icon: sub.icon,
      suggested_amount: 0,
      confidence: 'low',
    };

    setLocalSubcategories((prev) => ({
      ...prev,
      [addSubCategory.code]: [...(prev[addSubCategory.code] ?? []), newSub],
    }));

    setStepData((prev) => ({
      ...prev,
      [addSubCategory.code]: {
        ...(prev[addSubCategory.code] ?? {}),
        [sub.code]: 0,
      },
    }));

    setAddSubOpen(false);
    setAddSubCategory(null);
  };

  const handleSave = () => {
    if (!wizardData) return;

    const lines: BudgetLineItem[] = [];
    for (const cat of categories) {
      // Merge local subcategories so newly created ones are included in the plan
      const mergedSubs = [...cat.subcategories, ...(localSubcategories[cat.code] ?? [])];
      const subAmounts = stepData[cat.code] ?? {};
      for (const sub of mergedSubs) {
        const amount = subAmounts[sub.code] ?? sub.suggested_amount;
        if (amount > 0) {
          lines.push({ subcategory_code: sub.code, amount });
        }
      }
    }

    const draft: BudgetPlanDraft = {
      month,
      total_income: totalIncome,
      lines,
    };

    onComplete(draft);
  };

  // ── Progress dots ──────────────────────────────────────────────────────────

  // Dots represent steps 1–5 (category steps)
  const progressDots = Array.from({ length: PROGRESS_STEP_COUNT }, (_, i) => {
    const dotStep = i + 1; // 1..5
    const isCompleted = currentStep > dotStep;
    const isCurrent = currentStep === dotStep;
    const cat = categories[i];
    const colorVar = cat ? `var(--color-${cat.code})` : 'var(--color-text-disabled)';

    return (
      <div
        key={dotStep}
        className={[
          styles.dot,
          isCompleted ? styles.dotCompleted : '',
          isCurrent ? styles.dotCurrent : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={(isCompleted || isCurrent) ? ({ '--dot-color': colorVar } as React.CSSProperties) : undefined}
        aria-label={cat?.name ?? `Paso ${dotStep}`}
      />
    );
  });

  // ── Step color for header accent ───────────────────────────────────────────

  const currentCat = categoryForStep(currentStep, categories);
  const headerAccentColor = currentCat
    ? `var(--color-${currentCat.code})`
    : currentStep === 0
    ? 'var(--color-income)'
    : 'var(--color-brand)';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <IonModal
        isOpen={isOpen}
        onDidDismiss={onClose}
        keepContentsMounted
        style={{
          '--border-radius': '24px',
          '--width': 'min(640px, 96vw)',
          '--height': 'min(90dvh, 820px)',
        }}
      >
        <IonHeader className="ion-no-border">
          <IonToolbar className={styles.toolbar}>
            <div
              className={styles.toolbarAccent}
              style={{ '--accent-color': headerAccentColor } as React.CSSProperties}
            />
            <IonTitle className={styles.toolbarTitle}>
              {wizardData ? stepTitle(currentStep, categories) : 'Plan mensual'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={onClose} className={styles.closeBtn}>
                ✕
              </IonButton>
            </IonButtons>
          </IonToolbar>

          {/* Progress bar — only show during category steps */}
          {currentStep >= CATEGORY_STEP_FIRST && currentStep <= SUMMARY_STEP && (
            <div className={styles.progressBar}>
              {progressDots}
            </div>
          )}
        </IonHeader>

        <IonContent className={styles.content}>
          {!wizardData ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>Cargando datos del plan...</p>
            </div>
          ) : (
            <>
              {/* Step 0: Income */}
              {currentStep === 0 && (
                <BudgetIncomeStep
                  wizardData={wizardData}
                  incomeSources={incomeSources}
                  totalIncome={totalIncome}
                  includeVariable={includeVariable}
                  onIncomeChange={handleIncomeChange}
                  onToggleVariable={() => setIncludeVariable((v) => !v)}
                />
              )}

              {/* Steps 1–5: Category */}
              {currentStep >= CATEGORY_STEP_FIRST && currentStep <= CATEGORY_STEP_LAST && (() => {
                const cat = categoryForStep(currentStep, categories);
                if (!cat) return null;

                // Merge locally created subcategories so they appear immediately
                const mergedCategory: WizardCategory = {
                  ...cat,
                  subcategories: [
                    ...cat.subcategories,
                    ...(localSubcategories[cat.code] ?? []),
                  ],
                };

                return (
                  <BudgetCategoryStep
                    category={mergedCategory}
                    amounts={stepData[cat.code] ?? {}}
                    totalIncome={totalIncome}
                    alreadyCommitted={alreadyCommitted}
                    onAmountChange={(subCode, amount) =>
                      handleAmountChange(cat.code, subCode, amount)
                    }
                    onAddSubcategory={() => {
                      setAddSubCategory(cat);
                      setAddSubOpen(true);
                    }}
                  />
                );
              })()}

              {/* Step 6: Summary — pass merged categories so locally added subs show up */}
              {currentStep === SUMMARY_STEP && (
                <BudgetSummaryStep
                  categories={categories.map((cat) => ({
                    ...cat,
                    subcategories: [
                      ...cat.subcategories,
                      ...(localSubcategories[cat.code] ?? []),
                    ],
                  }))}
                  stepData={stepData}
                  totalIncome={totalIncome}
                />
              )}
            </>
          )}
        </IonContent>

        {/* Footer navigation */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {canGoBack && (
              <button type="button" className={styles.backBtn} onClick={goBack}>
                ← Atrás
              </button>
            )}
          </div>

          <div className={styles.footerRight}>
            {isLastStep ? (
              <>
                <button type="button" className={styles.reviewBtn} onClick={goBack}>
                  Revisar
                </button>
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={!wizardData}>
                  Guardar plan
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={goNext}
                disabled={!wizardData}
              >
                {currentStep === CATEGORY_STEP_LAST ? 'Ver resumen' : 'Siguiente'} →
              </button>
            )}
          </div>
        </div>
      </IonModal>

      {/* Subcategory creation sheet — rendered outside IonModal to avoid z-index nesting */}
      {addSubCategory !== null && (
        <AddSubcategorySheet
          isOpen={addSubOpen}
          onClose={() => {
            setAddSubOpen(false);
            setAddSubCategory(null);
          }}
          categoryCode={addSubCategory.code}
          categoryName={addSubCategory.name}
          categoryId={addSubCategory.id}
          onCreated={handleSubcategoryCreated}
        />
      )}
    </>
  );
};
