import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  cardOutline,
  cashOutline,
  walletOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useLocation } from 'react-router-dom';
import { AvatarNucleus } from '../../atoms/AvatarNucleus';
import { useAgentUI } from '../../../contexts/AgentUIContext';
import { useToast } from '../../../hooks/useToast';
import { useProgressStore } from '../../../store/progressStore';
import type { PaymentSource } from '../../../types/finance.types';
import styles from './QuickCapturePage.module.css';

const PAYMENT_SOURCE_LABEL: Record<PaymentSource, string> = {
  credit_card: 'Tarjeta de crédito',
  debit: 'Débito',
  cash: 'Efectivo',
};

const PAYMENT_SOURCE_TONE: Record<PaymentSource, string> = {
  credit_card: 'Crédito. Sale del flujo.',
  debit: 'Débito. Sale de caja.',
  cash: 'Efectivo. Sin ruido.',
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

const buildAgentMessage = (text: string, paymentSource: PaymentSource) => {
  const paymentLabel = PAYMENT_SOURCE_LABEL[paymentSource];
  return [
    'Registro rapido desde shortcut de la app.',
    `Medio de pago ya seleccionado por el usuario: ${paymentLabel} (${paymentSource}).`,
    'Usa el mismo comportamiento del agente de Telegram para clasificar y registrar el gasto.',
    `Mensaje del usuario: ${text}`,
  ].join('\n');
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

  const { startChat } = useAgentUI();
  const { showError, toast } = useToast();
  const { data, fetchProgress, getEffectiveLevel } = useProgressStore();
  const avatarSeed = data?.avatarSeed ?? 'quick-capture';
  const avatarLevel = getEffectiveLevel();
  const assistantMessage = saving
    ? 'Leyendo el gasto.'
    : successCount > 0
      ? 'Lo tengo.'
      : quickPaymentSource
        ? PAYMENT_SOURCE_TONE[quickPaymentSource]
        : 'Dime el gasto.';

  useEffect(() => {
    setQuickPaymentSource(initialPaymentSource);
    setQuickError(null);
  }, [initialPaymentSource]);

  useEffect(() => {
    void fetchProgress();
  }, [fetchProgress]);

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

  const handleQuickSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = quickText.trim();

    if (!text) {
      setQuickError('Escribe el gasto que quieres registrar.');
      return;
    }

    if (!quickPaymentSource) {
      setQuickError('Elige si fue tarjeta, débito o efectivo.');
      return;
    }

    setQuickError(null);
    setSaving(true);

    const didStart = await startChat(buildAgentMessage(text, quickPaymentSource), 'shortcut');
    setSaving(false);

    if (didStart) {
      setSuccessCount((n) => n + 1);
      setQuickText('');
      inputRef.current?.focus();
      void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } else {
      showError('No fue posible enviar el gasto al agente.');
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className={styles.content}>
        <div className={styles.wrapper}>

          <div className={styles.agentSection}>
            <div
              className={`${styles.avatarHalo}${successCount > 0 ? ` ${styles.avatarHaloActive}` : ''}`}
              aria-hidden="true"
            >
              <div className={styles.haloRing} />
              <div className={styles.avatarMark}>
                <AvatarNucleus seed={avatarSeed} level={avatarLevel} size={18} />
              </div>
            </div>

            <div className={[styles.agentBubble, saving ? styles.agentBubbleThinking : ''].filter(Boolean).join(' ')}>
              <p>{assistantMessage}</p>
              {saving ? (
                <span className={styles.thinkingDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
            </div>
          </div>

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
                Enviar
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
