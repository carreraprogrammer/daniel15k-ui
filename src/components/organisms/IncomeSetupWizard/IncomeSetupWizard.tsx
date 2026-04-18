import { useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { financeService } from '../../../services/financeService';
import type { IncomeSourcePayload } from '../../../types/finance.types';
import {
  BIWEEKLY_DAY_OPTIONS,
  INCOME_CADENCE_OPTIONS,
  MONTHLY_WINDOW_OPTIONS,
  RELIABILITY_OPTIONS,
  buildIncomeSchedules,
  windowRange,
} from '../../../utils/incomeProfile';
import styles from './IncomeSetupWizard.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

type Cadence = 'monthly' | 'biweekly' | 'weekly' | 'irregular';
type WindowKey = 'early' | 'week1' | 'q1' | 'mid' | 'q2' | 'late';
type Step = 'base' | 'ask_variable' | 'variable' | 'done';

interface BaseForm {
  name: string;
  amount: number | '';
  cadence: Cadence;
  windowKey: WindowKey;
  biweeklyDay1: number | '';
  biweeklyDay2: number | '';
}

interface VarForm {
  name: string;
  amount: number | '';
  cadence: Cadence;
  windowKey: WindowKey;
  biweeklyDay1: number | '';
  biweeklyDay2: number | '';
  reliability: number;
}

const emptyBase = (): BaseForm => ({
  name: '',
  amount: '',
  cadence: 'monthly',
  windowKey: 'q2',
  biweeklyDay1: 5,
  biweeklyDay2: 20,
});

const emptyVar = (): VarForm => ({
  name: '',
  amount: '',
  cadence: 'irregular',
  windowKey: 'mid',
  biweeklyDay1: 10,
  biweeklyDay2: 25,
  reliability: 75,
});

// ── Component ────────────────────────────────────────────────────────────────

export interface IncomeSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const IncomeSetupWizard = ({ isOpen, onClose, onComplete }: IncomeSetupWizardProps) => {
  const [step, setStep] = useState<Step>('base');
  const [base, setBase] = useState<BaseForm>(emptyBase());
  const [varIncome, setVarIncome] = useState<VarForm>(emptyVar());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('base');
    setBase(emptyBase());
    setVarIncome(emptyVar());
    setError(null);
    setSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };
  const handleDone  = () => { reset(); onComplete?.(); onClose(); };

  // ── Validación ──────────────────────────────────────────────────────────

  const validateIncome = (income: BaseForm | VarForm): string | null => {
    if (!income.name.trim()) return 'Escribe el nombre del ingreso.';
    if (income.amount === '' || Number(income.amount) <= 0) return 'Ingresa un monto mayor a cero.';
    if (income.cadence === 'biweekly') {
      if (income.biweeklyDay1 === '' || income.biweeklyDay2 === '') {
        return 'Seleccioná los dos días de pago.';
      }
      if (income.biweeklyDay1 === income.biweeklyDay2) {
        return 'Los dos días de pago deben ser distintos.';
      }
    }
    return null;
  };

  const buildPayloads = (
    income: BaseForm | VarForm,
    classification: IncomeSourcePayload['classification'],
    reliabilityScore: number,
  ): IncomeSourcePayload[] => {
    const amount = Number(income.amount);
    const schedules = buildIncomeSchedules(income.cadence, amount, {
      windowKey: income.windowKey,
      biweeklyDay1: income.biweeklyDay1 === '' ? undefined : Number(income.biweeklyDay1),
      biweeklyDay2: income.biweeklyDay2 === '' ? undefined : Number(income.biweeklyDay2),
    });

    const summaryRange = income.cadence === 'irregular'
      ? { dayFrom: 1, dayTo: 31 }
      : income.cadence === 'monthly'
        ? windowRange(income.windowKey)
        : {
            dayFrom: Math.min(...schedules.map((schedule) => schedule.expected_day_from)),
            dayTo: Math.max(...schedules.map((schedule) => schedule.expected_day_to)),
          };

    return [
      {
        name: income.name.trim(),
        expected_amount: amount,
        expected_day_from: summaryRange.dayFrom,
        expected_day_to: summaryRange.dayTo,
        classification,
        cadence: income.cadence,
        reliability_score: reliabilityScore,
        is_variable: classification !== 'base',
        evidence_source: 'income_setup_wizard',
        schedules,
      },
    ];
  };

  // ── Guardar ingreso base ─────────────────────────────────────────────────

  const handleBaseNext = async () => {
    const err = validateIncome(base);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);

    try {
      const payloads = buildPayloads(base, 'base', 100);
      await Promise.all(payloads.map((payload) => financeService.createIncomeSource(payload)));

      setStep('ask_variable');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Guardar ingreso variable ─────────────────────────────────────────────

  const handleVariableSave = async () => {
    const err = validateIncome(varIncome);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);

    try {
      const payloads = buildPayloads(varIncome, 'variable', varIncome.reliability);
      await Promise.all(payloads.map((payload) => financeService.createIncomeSource(payload)));
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Títulos ──────────────────────────────────────────────────────────────

  const stepTitle: Record<Step, string> = {
    base:         'Paso 1 — Ingreso base',
    ask_variable: 'Paso 2 — Ingresos variables',
    variable:     'Paso 2b — Ingreso variable',
    done:         '¡Listo!',
  };

  const amountLabel = base.cadence === 'irregular' ? 'Monto cuando llega' : 'Monto total mensual';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} className="crud-modal">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{stepTitle[step]}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="crud-modal__content">

        {/* ── Step: Ingreso base ── */}
        {step === 'base' && (
          <div className={styles.panel}>
            <p className={styles.intro}>
              Necesito tu ingreso más seguro para calcular tu presupuesto real.
            </p>
            <div className={styles.grid}>
              <div className={styles.spanTwo}>
                <TextInput
                  name="wz-base-name"
                  label="Nombre"
                  value={base.name}
                  onChange={(name) => setBase((v) => ({ ...v, name }))}
                  placeholder="Ej. Salario EMAPTA"
                  required
                />
              </div>
              <div className={styles.spanTwo}>
                <SelectInput
                  name="wz-cadence"
                  label="¿Cada cuánto llega?"
                  value={base.cadence}
                  onChange={(c) => setBase((v) => ({ ...v, cadence: String(c) as Cadence }))}
                  options={INCOME_CADENCE_OPTIONS}
                  required
                />
              </div>
              <NumberInput
                name="wz-base-amount"
                label={amountLabel}
                value={base.amount}
                onChange={(amount) => setBase((v) => ({ ...v, amount }))}
                format="currency"
                prefix="$"
                min={0}
                required
              />
              <div />

              {base.cadence === 'biweekly' && (
                <>
                  <SelectInput
                    name="wz-day1"
                    label="Primer pago"
                    hint="Día del mes en que llega la 1ª cuota"
                    value={base.biweeklyDay1}
                    onChange={(d) => setBase((v) => ({ ...v, biweeklyDay1: Number(d) }))}
                    options={BIWEEKLY_DAY_OPTIONS}
                    required
                  />
                  <SelectInput
                    name="wz-day2"
                    label="Segundo pago"
                    hint="Día del mes en que llega la 2ª cuota"
                    value={base.biweeklyDay2}
                    onChange={(d) => setBase((v) => ({ ...v, biweeklyDay2: Number(d) }))}
                    options={BIWEEKLY_DAY_OPTIONS}
                    required
                  />
                  <p className={[styles.hint, styles.spanTwo].join(' ')}>
                    Se guardará una sola fuente de ingreso con dos ventanas de cobro y total mensual consolidado.
                  </p>
                </>
              )}

              {base.cadence === 'monthly' && (
                <div className={styles.spanTwo}>
                  <SelectInput
                    name="wz-window"
                    label="¿Cuándo suele llegar?"
                    value={base.windowKey}
                    onChange={(k) => setBase((v) => ({ ...v, windowKey: String(k) as WindowKey }))}
                    options={MONTHLY_WINDOW_OPTIONS}
                    required
                  />
                </div>
              )}

              {base.cadence === 'irregular' && (
                <p className={[styles.hint, styles.spanTwo].join(' ')}>
                  Los ingresos irregulares se guardan con ventana de mes completo.
                </p>
              )}

              {base.cadence === 'weekly' && (
                <p className={[styles.hint, styles.spanTwo].join(' ')}>
                  Se crearán cuatro ventanas semanales dentro de la misma fuente para reflejar el ingreso total del mes.
                </p>
              )}
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <Button label="Continuar" onClick={() => void handleBaseNext()} loading={saving} />
            </div>
          </div>
        )}

        {/* ── Step: ¿Ingreso variable? ── */}
        {step === 'ask_variable' && (
          <div className={styles.panel}>
            <p className={styles.intro}>
              ✅ Ingreso base guardado.
              <br /><br />
              ¿Tenés algún ingreso variable además? (freelance, comisiones, arriendo recibido…)
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.choiceRow}>
              <Button label="Sí, agregar uno" onClick={() => setStep('variable')} />
              <Button label="No, listo" variant="ghost" onClick={() => setStep('done')} />
            </div>
          </div>
        )}

        {/* ── Step: Ingreso variable ── */}
        {step === 'variable' && (
          <div className={styles.panel}>
            <p className={styles.intro}>
              Los ingresos variables se pesan por confiabilidad — el 50% significa que llega la mitad de los meses.
            </p>
            <div className={styles.grid}>
              <div className={styles.spanTwo}>
                <TextInput
                  name="wz-var-name"
                  label="Nombre"
                  value={varIncome.name}
                  onChange={(name) => setVarIncome((v) => ({ ...v, name }))}
                  placeholder="Ej. Freelance 525, Comisión ventas"
                  required
                />
              </div>
              <NumberInput
                name="wz-var-amount"
                label="Monto cuando llega"
                value={varIncome.amount}
                onChange={(amount) => setVarIncome((v) => ({ ...v, amount }))}
                format="currency"
                prefix="$"
                min={0}
                required
              />
              <SelectInput
                name="wz-var-cadence"
                label="¿Cada cuánto llega?"
                value={varIncome.cadence}
                onChange={(cadence) => setVarIncome((v) => ({ ...v, cadence: String(cadence) as Cadence }))}
                options={INCOME_CADENCE_OPTIONS}
                required
              />
              {varIncome.cadence === 'biweekly' ? (
                <>
                  <SelectInput
                    name="wz-var-day1"
                    label="Primer pago"
                    hint="Día del mes en que suele llegar la 1ª parte"
                    value={varIncome.biweeklyDay1}
                    onChange={(day) => setVarIncome((v) => ({ ...v, biweeklyDay1: Number(day) }))}
                    options={BIWEEKLY_DAY_OPTIONS}
                    required
                  />
                  <SelectInput
                    name="wz-var-day2"
                    label="Segundo pago"
                    hint="Día del mes en que suele llegar la 2ª parte"
                    value={varIncome.biweeklyDay2}
                    onChange={(day) => setVarIncome((v) => ({ ...v, biweeklyDay2: Number(day) }))}
                    options={BIWEEKLY_DAY_OPTIONS}
                    required
                  />
                </>
              ) : null}
              {varIncome.cadence === 'monthly' ? (
                <div className={styles.spanTwo}>
                  <SelectInput
                    name="wz-var-window"
                    label="¿En qué parte del mes suele llegar?"
                    value={varIncome.windowKey}
                    onChange={(k) => setVarIncome((v) => ({ ...v, windowKey: String(k) as WindowKey }))}
                    options={MONTHLY_WINDOW_OPTIONS}
                  />
                </div>
              ) : null}
              {varIncome.cadence === 'irregular' ? (
                <p className={[styles.hint, styles.spanTwo].join(' ')}>
                  Los ingresos irregulares se guardan con ventana de mes completo.
                </p>
              ) : null}
              {varIncome.cadence === 'weekly' && (
                <p className={[styles.hint, styles.spanTwo].join(' ')}>
                  Se guardará una sola fuente con cuatro ventanas semanales y confiabilidad variable.
                </p>
              )}
              <div className={styles.spanTwo}>
                <SelectInput
                  name="wz-var-reliability"
                  label="¿Qué tan seguido llega?"
                  value={varIncome.reliability}
                  onChange={(r) => setVarIncome((v) => ({ ...v, reliability: Number(r) }))}
                  options={RELIABILITY_OPTIONS}
                />
              </div>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <Button label="Atrás" variant="ghost" onClick={() => { setError(null); setStep('ask_variable'); }} disabled={saving} />
              <Button label="Guardar ingreso variable" onClick={() => void handleVariableSave()} loading={saving} />
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className={styles.panel}>
            <div className={styles.successIcon}>✅</div>
            <p className={styles.successTitle}>¡Perfil de ingresos guardado!</p>
            <p className={styles.successBody}>
              El sistema ya puede calcular tu presupuesto mensual real. Podés ajustar o agregar más ingresos en cualquier momento desde tu perfil.
            </p>
            <div className={styles.actions}>
              <Button label="Cerrar" onClick={handleDone} />
            </div>
          </div>
        )}

      </IonContent>
    </IonModal>
  );
};
