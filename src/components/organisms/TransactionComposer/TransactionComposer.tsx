import { IonIcon } from '@ionic/react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '../../atoms/Button';
import { DateInput } from '../../atoms/DateInput';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { AddSubcategorySheet } from '../BudgetWizard/AddSubcategorySheet';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import type {
  CategoryResource,
  PaymentSource,
  Transaction,
  TransactionCreatePayload,
  TransactionStatus,
  TransactionType,
  TransactionUpdatePayload,
} from '../../../types/finance.types';
import styles from '../ComposerForm.module.css';

const transactionTypeOptions = [
  { label: 'Gasto', value: 'expense' },
  { label: 'Ingreso', value: 'income' },
];

const transactionStatusOptions = [
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Pendiente', value: 'pending' },
];

const PAYMENT_SOURCE_OPTIONS: { value: PaymentSource; label: string }[] = [
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'debit',       label: 'Débito / Nequi' },
  { value: 'cash',        label: 'Efectivo' },
];

interface TransactionComposerValues {
  date: string;
  concept: string;
  product: string;
  amount: number | '';
  transactionType: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  subcategoryId: string;
  paymentSource: PaymentSource | null;
}

const emptyValues: TransactionComposerValues = {
  date: '',
  concept: '',
  product: '',
  amount: '',
  transactionType: 'expense',
  status: 'confirmed',
  categoryId: '',
  subcategoryId: '',
  paymentSource: null,
};

const toInputDate = (value: string) => {
  if (!value) return '';
  const parts = value.split('/');
  if (parts.length !== 3) return value;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

const toApiDate = (value: string) => {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const valuesFromTransaction = (transaction: Transaction | null): TransactionComposerValues => {
  if (!transaction) return emptyValues;

  return {
    date: toInputDate(transaction.attributes.date),
    concept: transaction.attributes.concept,
    product: transaction.attributes.product ?? '',
    amount: transaction.attributes.amount,
    transactionType: transaction.attributes.transaction_type ?? 'expense',
    status: transaction.attributes.status ?? 'confirmed',
    categoryId: transaction.attributes.category_id ? String(transaction.attributes.category_id) : '',
    subcategoryId: transaction.attributes.subcategory_id ? String(transaction.attributes.subcategory_id) : '',
    paymentSource: (transaction.attributes.payment_source as PaymentSource | null) ?? null,
  };
};

export interface TransactionComposerProps {
  transaction?: Transaction | null;
  categories: CategoryResource[];
  loading?: boolean;
  onCreate: (payload: TransactionCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: TransactionUpdatePayload) => Promise<void>;
  onCancel?: () => void;
}

export const TransactionComposer = ({
  transaction = null,
  categories,
  loading,
  onCreate,
  onUpdate,
  onCancel,
}: TransactionComposerProps) => {
  const [values, setValues] = useState<TransactionComposerValues>(emptyValues);
  const [localCategories, setLocalCategories] = useState<CategoryResource[]>(categories);
  const [subcategorySheetOpen, setSubcategorySheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(transaction);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear transacción'), [isEditing]);

  const selectedCategory = useMemo(
    () => localCategories.find((category) => String(category.id) === values.categoryId) ?? null,
    [localCategories, values.categoryId],
  );

  const subcategoryOptions = useMemo(
    () => selectedCategory?.relationships?.subcategories?.data ?? [],
    [selectedCategory],
  );

  useEffect(() => {
    setValues(valuesFromTransaction(transaction));
    setLocalCategories(categories);
    setError(null);
  }, [categories, transaction]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.date || !values.concept.trim() || !values.paymentSource || values.amount === '' || values.amount <= 0) {
      setError('Completa fecha, concepto, medio de pago y un monto mayor a cero.');
      return;
    }

    setError(null);

    const basePayload = {
      date: toApiDate(values.date),
      concept: values.concept.trim(),
      product: values.product.trim() || undefined,
      amount: Number(values.amount),
      status: values.status,
      category_id: values.categoryId ? Number(values.categoryId) : null,
      subcategory_id: values.subcategoryId ? Number(values.subcategoryId) : null,
      source: 'manual' as const,
      payment_source: values.paymentSource ?? undefined,
    };

    try {
      if (transaction) {
        await onUpdate(transaction.id, basePayload);
      } else {
        await onCreate({
          ...basePayload,
          transaction_type: values.transactionType,
        });
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar la transacción.');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Movimiento</p>
              <h3 className={styles.sectionTitle}>Contexto base</h3>
            </div>
            <p className={styles.sectionText}>
              Fecha, tipo y monto primero. Después clasifica el movimiento con el mismo sistema visual del resto de la app.
            </p>
          </div>

          <div className={styles.grid}>
            <DateInput
              name="transaction-date"
              label="Fecha"
              value={values.date}
              onChange={(date) => setValues((current) => ({ ...current, date }))}
              required
            />
            <SelectInput
              name="transaction-type"
              label="Tipo"
              value={values.transactionType}
              onChange={(transactionType) =>
                setValues((current) => ({ ...current, transactionType: transactionType as TransactionType }))
              }
              options={transactionTypeOptions}
              disabled={isEditing}
              required
            />
            <SelectInput
              name="transaction-status"
              label="Estado"
              value={values.status}
              onChange={(status) => setValues((current) => ({ ...current, status: status as TransactionStatus }))}
              options={transactionStatusOptions}
              required
            />
            <NumberInput
              name="transaction-amount"
              label="Monto"
              value={values.amount}
              onChange={(amount) => setValues((current) => ({ ...current, amount }))}
              format="currency"
              min={1}
              required
            />
            <div className={styles.spanTwo}>
              <TextInput
                name="transaction-concept"
                label="Concepto"
                value={values.concept}
                onChange={(concept) => setValues((current) => ({ ...current, concept }))}
                placeholder="Ej. pago suscripción, mercado, ingreso cliente"
                required
              />
            </div>
            <div className={styles.spanTwo}>
              <p className={styles.fieldLabel}>Medio de pago *</p>
              <div className={styles.paymentSourceRow}>
                {PAYMENT_SOURCE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={[
                      styles.paymentSourceBtn,
                      values.paymentSource === value ? styles.paymentSourceBtnActive : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() =>
                      setValues((current) => ({
                        ...current,
                        paymentSource: current.paymentSource === value ? null : value,
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {values.paymentSource === 'credit_card' ? (
              <div className={styles.spanTwo}>
                <TextInput
                  name="transaction-product"
                  label="Nombre de la tarjeta (opcional)"
                  value={values.product}
                  onChange={(product) => setValues((current) => ({ ...current, product }))}
                  placeholder="Ej. LifeMiles, TC Davivienda"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Clasificación</p>
              <h3 className={styles.sectionTitle}>Categoría y subcategoría</h3>
            </div>
            <p className={styles.sectionText}>
              Las categorías son estáticas. Si falta una subcategoría, puedes crearla sin salir del editor.
            </p>
          </div>

          <div className={styles.categoryRail}>
            {localCategories.map((category) => {
              const active = String(category.id) === values.categoryId;
              const accent = category.attributes.color ?? 'var(--color-accent)';
              return (
                <button
                  key={category.id}
                  type="button"
                  className={[styles.categoryToken, active ? styles.categoryTokenActive : ''].filter(Boolean).join(' ')}
                  style={{ '--category-accent': accent } as CSSProperties}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      categoryId: active ? '' : String(category.id),
                      subcategoryId: '',
                    }))
                  }
                >
                  <span className={styles.categorySwatch} />
                  <span className={styles.categoryTokenText}>{category.attributes.name ?? 'Sin categoría'}</span>
                </button>
              );
            })}
          </div>

          {selectedCategory ? (
            <div
              className={styles.subcategorySection}
              style={{ '--category-accent': selectedCategory.attributes.color ?? 'var(--color-accent)' } as CSSProperties}
            >
              <div className={styles.subcategoryHeader}>
                <span className={styles.subcategoryLabel}>Subcategoría</span>
                <button type="button" className={styles.addSubcategoryBtn} onClick={() => setSubcategorySheetOpen(true)}>
                  + Crear subcategoría
                </button>
              </div>

              <div className={styles.subcategoryRail}>
                {subcategoryOptions.map((subcategory) => {
                  const active = String(subcategory.id) === values.subcategoryId;
                  return (
                    <button
                      key={subcategory.id}
                      type="button"
                      className={[styles.subcategoryToken, active ? styles.subcategoryTokenActive : ''].filter(Boolean).join(' ')}
                      onClick={() =>
                        setValues((current) => ({
                          ...current,
                          subcategoryId: active ? '' : String(subcategory.id),
                        }))
                      }
                    >
                      <span className={styles.subcategoryIconWrap}>
                        <IonIcon
                          icon={resolveNamedIcon(subcategory.attributes?.icon ?? undefined)}
                          className={styles.subcategoryIcon}
                          aria-hidden="true"
                        />
                      </span>
                      <span className={styles.subcategoryTokenText}>{subcategory.attributes?.name ?? 'Sin subcategoría'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <Button label="Cancelar" variant="ghost" onClick={handleCancel} disabled={loading} />
          <Button label={submitLabel} onClick={() => void handleSubmit()} loading={loading} />
        </div>
      </section>

      {selectedCategory ? (
        <AddSubcategorySheet
          isOpen={subcategorySheetOpen}
          onClose={() => setSubcategorySheetOpen(false)}
          categoryCode={selectedCategory.attributes.code ?? 'unknown'}
          categoryName={selectedCategory.attributes.name ?? 'Categoría'}
          categoryId={String(selectedCategory.id)}
          onCreated={(sub) => {
            setLocalCategories((current) =>
              current.map((category) =>
                String(category.id) !== String(selectedCategory.id)
                  ? category
                  : {
                      ...category,
                      relationships: {
                        ...category.relationships,
                        subcategories: {
                          data: [
                            ...(category.relationships?.subcategories?.data ?? []),
                            {
                              id: sub.id,
                              type: 'subcategories',
                              attributes: {
                                name: sub.name,
                                code: sub.code,
                                icon: sub.icon,
                              },
                            },
                          ],
                        },
                      },
                    },
              ),
            );
            setValues((current) => ({ ...current, subcategoryId: sub.id }));
            setSubcategorySheetOpen(false);
          }}
        />
      ) : null}
    </>
  );
};
