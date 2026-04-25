import { useEffect, useMemo, useState } from 'react';
import { IonContent } from '@ionic/react';
import { AppLayout } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
import { DateInput } from '../../atoms/DateInput';
import { NumberInput } from '../../atoms/NumberInput';
import { TextInput } from '../../atoms/TextInput';
import { Spinner } from '../../atoms/Spinner';
import { CrudModal } from '../../molecules/CrudModal';
import { EmptyState } from '../../molecules/EmptyState';
import { ErrorState } from '../../molecules/ErrorState';
import { financeService } from '../../../services/financeService';
import type { SavingsGoal, SavingsGoalPayload } from '../../../types/finance.types';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import pageStyles from '../FinancePage.module.css';
import styles from './SavingsGoalsPage.module.css';

type GoalForm = {
  name: string;
  target_amount: number | '';
  current_amount: number | '';
  target_date: string;
  monthly_contribution: number | '';
};

const emptyForm: GoalForm = {
  name: '',
  target_amount: '',
  current_amount: 0,
  target_date: '',
  monthly_contribution: 0,
};

const goalToForm = (goal: SavingsGoal): GoalForm => ({
  name: goal.name,
  target_amount: goal.target_amount,
  current_amount: goal.current_amount,
  target_date: goal.target_date ?? '',
  monthly_contribution: goal.monthly_contribution,
});

const formToPayload = (form: GoalForm): SavingsGoalPayload => ({
  name: form.name,
  target_amount: Number(form.target_amount || 0),
  current_amount: Number(form.current_amount || 0),
  target_date: form.target_date || null,
  monthly_contribution: Number(form.monthly_contribution || 0),
});

export const SavingsGoalsPage = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setGoals(await financeService.getSavingsGoals());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las metas de ahorro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(
    () => ({
      current: goals.reduce((sum, goal) => sum + goal.current_amount, 0),
      target: goals.reduce((sum, goal) => sum + goal.target_amount, 0),
    }),
    [goals],
  );

  const openNew = () => {
    setEditingGoal(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setForm(goalToForm(goal));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingGoal(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = formToPayload(form);
      if (editingGoal) {
        await financeService.updateSavingsGoal(editingGoal.id, payload);
      } else {
        await financeService.createSavingsGoal(payload);
      }
      closeModal();
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGoal = async (goal: SavingsGoal) => {
    await financeService.deleteSavingsGoal(goal.id);
    await load();
  };

  return (
    <AppLayout title="Metas">
      <IonContent className={pageStyles.pageContent}>
        <section className={pageStyles.stack}>
          <div className={pageStyles.focusStage}>
            <div className={`${pageStyles.focusCard} ${pageStyles.focusCardFull}`}>
              <div className={pageStyles.focusGrid}>
                <div className={pageStyles.focusCopy}>
                  <span className={pageStyles.eyebrow}>Ahorro dirigido</span>
                  <p className={pageStyles.focusQuestion}>¿Qué meta concreta estás financiando mes a mes?</p>
                  <h2 className={pageStyles.focusTitle}>
                    {goals.length ? `${goals.length} metas activas` : 'Crea tu primera meta'}
                  </h2>
                  <p className={pageStyles.focusText}>
                    Define montos objetivo y fechas para convertir el ahorro en una decisión mensual explícita.
                  </p>
                </div>
                <div>
                  <div className={pageStyles.focusValue}>{formatCurrencyCompact(totals.current)}</div>
                  <p className={pageStyles.focusCaption}>
                    acumulado de {formatCurrencyCompact(totals.target)} objetivo
                  </p>
                </div>
              </div>
              <div className={pageStyles.focusActions}>
                <Button label="Nueva meta" onClick={openNew} />
              </div>
            </div>
          </div>

          {loading ? <Spinner size="lg" /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && !goals.length ? <EmptyState message="No hay metas de ahorro registradas." /> : null}

          {!loading && !error && goals.length ? (
            <div className={pageStyles.list}>
              {goals.map((goal) => {
                const progress = goal.target_amount > 0
                  ? Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100)
                  : 0;
                return (
                  <article key={goal.id} className={pageStyles.listItem}>
                    <div className={pageStyles.listPrimary}>
                      <span className={pageStyles.listLabel}>{goal.name}</span>
                      <span className={pageStyles.listMeta}>
                        {formatCurrencyCompact(goal.current_amount)} de {formatCurrencyCompact(goal.target_amount)}
                      </span>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                      </div>
                      <span className={pageStyles.listMeta}>
                        Aporte necesario: {goal.monthly_contribution_needed === null ? 'sin fecha objetivo' : formatCurrencyCompact(goal.monthly_contribution_needed)}
                      </span>
                    </div>
                    <div className={pageStyles.listSecondary}>
                      <span className={pageStyles.pill}>{progress}%</span>
                      <span className={pageStyles.listMeta}>
                        {goal.target_date ? `Fecha objetivo ${goal.target_date}` : 'Sin fecha objetivo'}
                      </span>
                      <div className={styles.actions}>
                        <Button label="Editar" variant="ghost" size="sm" onClick={() => openEdit(goal)} />
                        <Button label="Eliminar" variant="danger" size="sm" onClick={() => void deleteGoal(goal)} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <CrudModal
          isOpen={modalOpen}
          title={editingGoal ? 'Editar meta' : 'Nueva meta'}
          subtitle="Define el objetivo y una fecha opcional para calcular el aporte mensual necesario."
          onClose={closeModal}
        >
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <TextInput
              name="savings-goal-name"
              label="Nombre"
              value={form.name}
              onChange={(name) => setForm((current) => ({ ...current, name }))}
              required
            />
            <NumberInput
              name="savings-goal-target"
              label="Monto objetivo"
              value={form.target_amount}
              onChange={(target_amount) => setForm((current) => ({ ...current, target_amount }))}
              min={1}
              format="currency"
              required
            />
            <NumberInput
              name="savings-goal-current"
              label="Monto actual"
              value={form.current_amount}
              onChange={(current_amount) => setForm((current) => ({ ...current, current_amount }))}
              min={0}
              format="currency"
            />
            <DateInput
              name="savings-goal-target-date"
              label="Fecha objetivo"
              value={form.target_date}
              onChange={(target_date) => setForm((current) => ({ ...current, target_date }))}
            />
            <NumberInput
              name="savings-goal-monthly"
              label="Aporte mensual actual"
              value={form.monthly_contribution}
              onChange={(monthly_contribution) => setForm((current) => ({ ...current, monthly_contribution }))}
              min={0}
              format="currency"
            />
            <div className={styles.formActions}>
              <Button label="Cancelar" variant="ghost" onClick={closeModal} disabled={submitting} />
              <Button label={submitting ? 'Guardando…' : 'Guardar'} type="submit" disabled={submitting} />
            </div>
          </form>
        </CrudModal>
      </IonContent>
    </AppLayout>
  );
};
