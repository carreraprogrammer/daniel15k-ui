import { useEffect, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { TransactionComposer } from '../../organisms/TransactionComposer/TransactionComposer';
import { BrandMark } from '../../atoms/BrandMark/BrandMark';
import { ErrorState } from '../../molecules/ErrorState';
import { useToast } from '../../../hooks/useToast';
import { financeService } from '../../../services/financeService';
import type { CategoryResource, PaymentSource, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import styles from './QuickCapturePage.module.css';

const PAYMENT_SOURCE_LABEL: Record<PaymentSource, string> = {
  credit_card: 'Tarjeta de crédito',
  debit: 'Débito',
  cash: 'Efectivo',
};

const parsePaymentSource = (search: string): PaymentSource | null => {
  const raw = new URLSearchParams(search).get('payment_source');
  return raw === 'credit_card' || raw === 'debit' || raw === 'cash' ? raw : null;
};

export const QuickCapturePage = () => {
  const location = useLocation();
  const initialPaymentSource = parsePaymentSource(location.search);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);

  const { showError, showSuccess, toast } = useToast();

  const loadCategories = async () => {
    setCategoryError(null);

    try {
      const res = await financeService.fetchCategories();
      setCategories(res.data);
    } catch (nextError) {
      setCategoryError(nextError instanceof Error ? nextError.message : 'No fue posible cargar las categorías.');
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (successCount > 0) {
      const t = setTimeout(() => setSuccessCount(0), 2000);
      return () => clearTimeout(t);
    }
  }, [successCount]);

  const handleCreate = async (payload: TransactionCreatePayload) => {
    setSaving(true);
    try {
      await financeService.createTransaction({ ...payload, source: 'manual' });
      setSuccessCount((n) => n + 1);
      showSuccess('Transacción guardada.');
      inputRef.current?.querySelector('input')?.focus();
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible guardar la transacción.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, payload: TransactionUpdatePayload) => {
    setSaving(true);
    try {
      await financeService.updateTransaction(id, payload);
      showSuccess('Transacción actualizada.');
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible actualizar la transacción.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className={styles.content}>
        <div className={styles.wrapper}>
          <header className={styles.header}>
            <BrandMark />
            {successCount > 0 ? (
              <span className={styles.successBadge}>
                <IonIcon icon={checkmarkCircleOutline} aria-hidden="true" />
                Guardado
              </span>
            ) : initialPaymentSource ? (
              <span className={styles.sourceBadge}>{PAYMENT_SOURCE_LABEL[initialPaymentSource]}</span>
            ) : null}
          </header>

          {categoryError ? (
            <ErrorState
              title="No pudimos preparar la captura"
              message={categoryError}
              onRetry={() => void loadCategories()}
            />
          ) : null}

          <div ref={inputRef} className={styles.composerWrap}>
            <TransactionComposer
              categories={categories}
              initialPaymentSource={initialPaymentSource}
              loading={saving}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />
          </div>
          {toast}
        </div>
      </IonContent>
    </IonPage>
  );
};
