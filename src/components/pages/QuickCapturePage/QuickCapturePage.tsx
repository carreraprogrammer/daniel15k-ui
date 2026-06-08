import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  cardOutline,
  cashOutline,
  walletOutline,
  micOutline,
  checkmarkOutline,
  chevronBackOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useLocation } from 'react-router-dom';
import { Buddy } from '../../atoms/Buddy';
import { useBuddyStore } from '../../../store/buddyStore';
import { useAgentUI } from '../../../contexts/AgentUIContext';
import { useToast } from '../../../hooks/useToast';
import type { PaymentSource } from '../../../types/finance.types';
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

const buildAgentMessage = (text: string, paymentSource: PaymentSource) => {
  const paymentLabel = PAYMENT_SOURCE_LABEL[paymentSource];
  return [
    'Registro rapido desde shortcut de la app.',
    `Medio de pago ya seleccionado por el usuario: ${paymentLabel} (${paymentSource}).`,
    'Usa el mismo comportamiento del agente de Telegram para clasificar y registrar el gasto.',
    `Mensaje del usuario: ${text}`,
  ].join('\n');
};

function parseAmount(text: string): number {
  const t = text.toLowerCase().trim();
  if (!t) return 0;
  const m = t.match(/(\d[\d.,]*)\s*(mil|k|millones|m)?/);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/[.,]/g, ''));
  if (m[2] === 'mil' || m[2] === 'k') n *= 1000;
  if (m[2] === 'millones' || m[2] === 'm') n *= 1_000_000;
  return n;
}

function detectCategory(text: string): { cat: string; color: string } {
  const t = text.toLowerCase();
  if (/uber|taxi|bus|gasolina|metro/.test(t)) return { cat: 'Transporte', color: '#D4732A' };
  if (/mercado|carulla|exito|d1/.test(t)) return { cat: 'Mercado', color: '#D4732A' };
  if (/almuerzo|cena|desayuno|restaurante|brulee/.test(t)) return { cat: 'Restaurantes', color: '#C9980A' };
  if (/spotify|netflix|suscrip|chatgpt/.test(t)) return { cat: 'Suscripciones', color: '#C9980A' };
  if (/cine|cerveza|bar|salida/.test(t)) return { cat: 'Ocio', color: '#8A4FD8' };
  if (/regalo|cumple/.test(t)) return { cat: 'Regalos', color: '#8A4FD8' };
  return { cat: 'Gasto', color: '#5FB58A' };
}

const fmt = (n: number) => n.toLocaleString('es-CO');

export const QuickCapturePage = () => {
  const location = useLocation();
  const initialPaymentSource = parsePaymentSource(location.search);
  const [saving, setSaving] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);
  const [successPm, setSuccessPm] = useState<string>('');
  const [quickText, setQuickText] = useState('');
  const [quickPaymentSource, setQuickPaymentSource] = useState<PaymentSource | null>(initialPaymentSource);
  const [quickError, setQuickError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { startChat } = useAgentUI();
  const { showError, toast } = useToast();
  const persona = useBuddyStore((s) => s.persona);

  const parsedAmount = useMemo(() => parseAmount(quickText), [quickText]);
  const parsedCategory = useMemo(() => detectCategory(quickText), [quickText]);
  const canSave = parsedAmount > 0;

  const emotion = saving ? 'think' : successAmount !== null ? 'cheer' : canSave ? 'happy' : 'calm';

  // Auto-grow textarea
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [quickText]);

  useEffect(() => {
    setQuickPaymentSource(initialPaymentSource);
    setQuickError(null);
  }, [initialPaymentSource]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const handleQuickSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
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
      setSuccessAmount(parsedAmount || 1);
      setSuccessPm(PAYMENT_SOURCE_LABEL[quickPaymentSource]);
      void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } else {
      showError('No fue posible enviar el gasto al agente.');
    }
  };

  const handleReset = () => {
    setSuccessAmount(null);
    setSuccessPm('');
    setQuickText('');
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const confirmLabel = saving
    ? 'Guardando…'
    : canSave && quickPaymentSource
      ? `Anotar $${fmt(parsedAmount)}`
      : quickText.trim() && quickPaymentSource
        ? 'Enviar'
        : 'Escribe el gasto';

  return (
    <IonPage>
      <IonContent fullscreen className={styles.content}>
        <div className={styles.wrapper}>

          {/* Close */}
          <button type="button" className={styles.closeLink} onClick={() => history.back()}>
            <IonIcon icon={chevronBackOutline} />
            Cerrar
          </button>

          {/* Success state */}
          {successAmount !== null ? (
            <div className={styles.doneSection}>
              <Buddy persona={persona} emotion="cheer" size={110} />
              <p className={styles.doneTitle}>¡Anotado!</p>
              <div className={styles.doneCard}>
                <div className={styles.doneAmt}>${fmt(successAmount)}</div>
                <div className={styles.doneMeta}>{parsedCategory.cat} · {successPm}</div>
              </div>
              <button type="button" className={styles.doneAgain} onClick={handleReset}>
                Registrar otro gasto
              </button>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div className={styles.hero}>
                <Buddy persona={persona} emotion={emotion} size={92} />
                <div className={styles.prompt}>
                  {canSave
                    ? <>Lo escuché: <span className={styles.accent}>${fmt(parsedAmount)}</span></>
                    : 'Dime el gasto.'}
                </div>
              </div>

              {/* Form */}
              <form className={styles.form} onSubmit={handleQuickSubmit}>
                {/* Input card */}
                <div className={styles.inputCard}>
                  <div className={styles.inputRow}>
                    <textarea
                      ref={inputRef}
                      className={styles.ta}
                      value={quickText}
                      onChange={(e) => setQuickText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleQuickSubmit();
                        }
                      }}
                      placeholder='Ej: "almuerzo 18 mil" o "uber 14k"'
                      rows={1}
                      disabled={saving}
                      autoComplete="off"
                      aria-label="Captura rápida"
                    />
                    <button type="button" className={styles.micBtn} aria-label="Dictar" disabled={saving}>
                      <IonIcon icon={micOutline} />
                    </button>
                  </div>

                  {canSave && (
                    <div className={styles.parseStrip}>
                      <span className={`${styles.parseTag} ${styles.parseTagAmt}`}>
                        <span className={styles.parseKey}>monto</span>
                        ${fmt(parsedAmount)}
                      </span>
                      <span className={styles.parseTag}>
                        <span className={styles.parseSwatch} style={{ background: parsedCategory.color }} />
                        {parsedCategory.cat}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <p className={styles.pmLabel}>¿Con qué pagaste?</p>
                <div className={styles.pmRow}>
                  {PAYMENT_SOURCE_OPTIONS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={[styles.pmBtn, quickPaymentSource === value ? styles.pmBtnOn : ''].filter(Boolean).join(' ')}
                      onClick={() => { setQuickPaymentSource(value); setQuickError(null); }}
                      disabled={saving}
                    >
                      <IonIcon icon={icon} className={styles.pmIcon} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {quickError && <p className={styles.error}>{quickError}</p>}

                <div className={styles.spacer} />

                <button
                  className={styles.confirmBtn}
                  type="submit"
                  disabled={!quickText.trim() || !quickPaymentSource || saving}
                >
                  <IonIcon icon={checkmarkOutline} />
                  {confirmLabel}
                </button>
              </form>
            </>
          )}

          {toast}
        </div>
      </IonContent>
    </IonPage>
  );
};
