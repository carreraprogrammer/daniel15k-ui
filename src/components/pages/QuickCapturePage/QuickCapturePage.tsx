import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import { cardOutline, cashOutline, checkmarkCircleOutline, walletOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { BrandMark } from '../../atoms/BrandMark/BrandMark';
import { useToast } from '../../../hooks/useToast';
import { financeService } from '../../../services/financeService';
import type { PaymentSource, TransactionCreatePayload } from '../../../types/finance.types';
import { parseQuickCaptureText } from '../../../utils/quickCaptureParser';
import styles from './QuickCapturePage.module.css';

const PAYMENT_SOURCE_LABEL: Record<PaymentSource, string> = {
  credit_card: 'Tarjeta de crédito',
  debit: 'Débito',
  cash: 'Efectivo',
};

const PAYMENT_SOURCE_OPTIONS: Array<{ value: PaymentSource; label: string; icon: string }> = [
  { value: 'credit_card', label: 'Tarjeta', icon: cardOutline },
  { value: 'debit', label: 'Débito', icon: walletOutline },
  { value: 'cash', label: 'Efectivo', icon: cashOutline },
];

const parsePaymentSource = (search: string): PaymentSource | null => {
  const raw = new URLSearchParams(search).get('payment_source');
  return raw === 'credit_card' || raw === 'debit' || raw === 'cash' ? raw : null;
};

export const QuickCapturePage = () => {
  const location = useLocation();
  const initialPaymentSource = parsePaymentSource(location.search);
  const [saving, setSaving] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [quickText, setQuickText] = useState('');
  const [quickPaymentSource, setQuickPaymentSource] = useState<PaymentSource | null>(initialPaymentSource);
  const [quickError, setQuickError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { showError, showSuccess, toast } = useToast();

  useEffect(() => {
    setQuickPaymentSource(initialPaymentSource);
    setQuickError(null);
  }, [initialPaymentSource]);

  useEffect(() => {
    if (successCount > 0) {
      const t = setTimeout(() => setSuccessCount(0), 2000);
      return () => clearTimeout(t);
    }
  }, [successCount]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const handleCreate = async (payload: TransactionCreatePayload) => {
    setSaving(true);
    try {
      await financeService.createTransaction({ ...payload, source: 'manual' });
      setSuccessCount((n) => n + 1);
      showSuccess('Transacción guardada.');
      inputRef.current?.focus();
    } catch (nextError) {
      showError(nextError instanceof Error ? nextError.message : 'No fue posible guardar la transacción.');
      throw nextError;
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseQuickCaptureText(quickText, quickPaymentSource);

    if (!parsed.payload) {
      setQuickError(parsed.error);
      return;
    }

    setQuickError(null);
    try {
      await handleCreate(parsed.payload);
      setQuickText('');
    } catch {
      // handleCreate already surfaces the error through the shared toast.
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
            ) : quickPaymentSource ? (
              <span className={styles.sourceBadge}>{PAYMENT_SOURCE_LABEL[quickPaymentSource]}</span>
            ) : null}
          </header>

          <form className={styles.quickCard} onSubmit={handleQuickSubmit}>
            <div className={styles.quickInputRow}>
              <input
                ref={inputRef}
                className={styles.quickInput}
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
                placeholder="almuerzo 18000"
                inputMode="text"
                autoComplete="off"
                disabled={saving}
                aria-label="Captura rápida"
              />
              <button className={styles.quickSubmit} type="submit" disabled={saving || !quickText.trim()}>
                Guardar
              </button>
            </div>

            <div className={styles.quickSourceRow} aria-label="Medio de pago">
              {PAYMENT_SOURCE_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  className={[
                    styles.quickSourceButton,
                    quickPaymentSource === value ? styles.quickSourceButtonActive : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    setQuickPaymentSource(value);
                    setQuickError(null);
                  }}
                  disabled={saving}
                >
                  <IonIcon icon={icon} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {quickError ? <p className={styles.quickError}>{quickError}</p> : null}
          </form>
          <IonButton fill="clear" size="small" routerLink="/dashboard" className={styles.closeButton}>
            Cerrar
          </IonButton>
          {toast}
        </div>
      </IonContent>
    </IonPage>
  );
};
