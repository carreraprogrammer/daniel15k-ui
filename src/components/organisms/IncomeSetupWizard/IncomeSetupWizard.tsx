import { useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { financeService } from '../../../services/financeService';
import styles from './IncomeSetupWizard.module.css';

const reliabilityOptions = [
  { label: '25% — muy incierto', value: 25 },
  { label: '50% — la mitad de las veces', value: 50 },
  { label: '75% — casi siempre llega', value: 75 },
];

type Step = 'base' | 'ask_variable' | 'variable' | 'done';

interface IncomeForm {
  name: string;
  amount: number | '';
  dayFrom: number | '';
  dayTo: number | '';
  reliability: number;
}

const empty = (): IncomeForm => ({ name: '', amount: '', dayFrom: '', dayTo: '', reliability: 75 });

export interface IncomeSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const IncomeSetupWizard = ({ isOpen, onClose, onComplete }: IncomeSetupWizardProps) => {
  const [step, setStep] = useState<Step>('base');
  const [base, setBase] = useState<IncomeForm>(empty());
  const [variable, setVariable] = useState<IncomeForm>(empty());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('base');
    setBase(empty());
    setVariable(empty());
    setError(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateForm = (form: IncomeForm): string | null => {
    if (!form.name.trim()) return 'Escribe el nombre de este ingreso.';
    if (form.amount === '' || Number(form.amount) <= 0) return 'Ingresa un monto válido mayor a cero.';
    if (form.dayFrom === '' || form.dayTo === '') return 'Indica el rango de días en que suele llegar.';
    return null;
  };

  const handleBaseNext = async () => {
    const err = validateForm(base);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await financeService.createIncomeSource({
        name: base.name.trim(),
        expected_amount: Number(base.amount),
        expected_day_from: Number(base.dayFrom),
        expected_day_to: Number(base.dayTo),
        classification: 'base',
        reliability_score: 100,
        is_variable: false,
      });
      setStep('ask_variable');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleVariableSave = async () => {
    const err = validateForm(variable);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await financeService.createIncomeSource({
        name: variable.name.trim(),
        expected_amount: Number(variable.amount),
        expected_day_from: Number(variable.dayFrom),
        expected_day_to: Number(variable.dayTo),
        classification: 'variable',
        reliability_score: variable.reliability,
        is_variable: true,
      });
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    reset();
    onComplete?.();
    onClose();
  };

  const stepTitle: Record<Step, string> = {
    base: 'Paso 1 — Ingreso base',
    ask_variable: 'Paso 2 — Ingresos variables',
    variable: 'Paso 2b — Ingreso variable',
    done: '¡Listo!',
  };

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
        {step === 'base' && (
          <div className={styles.panel}>
            <p className={styles.intro}>
              Para calcular tu presupuesto real necesito conocer tu ingreso más seguro — el que siempre llega.
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
              <NumberInput
                name="wz-base-amount"
                label="Monto mensual"
                value={base.amount}
                onChange={(amount) => setBase((v) => ({ ...v, amount }))}
                format="currency"
                prefix="$"
                min={0}
                required
              />
              <NumberInput
                name="wz-base-day-from"
                label="Llega desde el día…"
                hint="Número del mes, ej: 1"
                value={base.dayFrom}
                onChange={(dayFrom) => setBase((v) => ({ ...v, dayFrom }))}
                format="integer"
                min={1}
                max={31}
                required
              />
              <NumberInput
                name="wz-base-day-to"
                label="…hasta el día"
                hint="Número del mes, ej: 5"
                value={base.dayTo}
                onChange={(dayTo) => setBase((v) => ({ ...v, dayTo }))}
                format="integer"
                min={1}
                max={31}
                required
              />
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <Button label="Continuar" onClick={() => void handleBaseNext()} loading={saving} />
            </div>
          </div>
        )}

        {step === 'ask_variable' && (
          <div className={styles.panel}>
            <p className={styles.intro}>
              ✅ Ingreso base guardado.
              <br /><br />
              ¿Tenés algún ingreso variable — freelance, comisiones, arriendo recibido?
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.choiceRow}>
              <Button label="Sí, agregar uno" onClick={() => setStep('variable')} />
              <Button label="No, listo" variant="ghost" onClick={() => setStep('done')} />
            </div>
          </div>
        )}

        {step === 'variable' && (
          <div className={styles.panel}>
            <p className={styles.intro}>
              Los ingresos variables se pesan por confiabilidad. El 50% significa que llega la mitad de los meses.
            </p>
            <div className={styles.grid}>
              <div className={styles.spanTwo}>
                <TextInput
                  name="wz-var-name"
                  label="Nombre"
                  value={variable.name}
                  onChange={(name) => setVariable((v) => ({ ...v, name }))}
                  placeholder="Ej. Freelance 525, Comisión ventas"
                  required
                />
              </div>
              <NumberInput
                name="wz-var-amount"
                label="Monto cuando llega"
                value={variable.amount}
                onChange={(amount) => setVariable((v) => ({ ...v, amount }))}
                format="currency"
                prefix="$"
                min={0}
                required
              />
              <div />
              <NumberInput
                name="wz-var-day-from"
                label="Llega desde el día…"
                hint="Número del mes, ej: 15"
                value={variable.dayFrom}
                onChange={(dayFrom) => setVariable((v) => ({ ...v, dayFrom }))}
                format="integer"
                min={1}
                max={31}
                required
              />
              <NumberInput
                name="wz-var-day-to"
                label="…hasta el día"
                hint="Número del mes, ej: 20"
                value={variable.dayTo}
                onChange={(dayTo) => setVariable((v) => ({ ...v, dayTo }))}
                format="integer"
                min={1}
                max={31}
                required
              />
              <div className={styles.spanTwo}>
                <SelectInput
                  name="wz-var-reliability"
                  label="¿Qué tan seguido llega?"
                  value={variable.reliability}
                  onChange={(r) => setVariable((v) => ({ ...v, reliability: Number(r) }))}
                  options={reliabilityOptions}
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
