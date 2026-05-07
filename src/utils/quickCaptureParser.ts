import type { PaymentSource, TransactionCreatePayload } from '../types/finance.types';

export interface QuickCaptureParseResult {
  payload: TransactionCreatePayload | null;
  error: string | null;
}

const amountPattern = /(?:^|\s)(\$?\s*\d+(?:[.,]\d+)?(?:\s*(?:k|mil))?)(?=$|\s)/gi;

const compactSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();

const toApiDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const parseAmount = (raw: string): number | null => {
  const lower = raw.toLowerCase();
  const multiplier = /\b(k|mil)\b/.test(lower) ? 1000 : 1;
  const cleaned = lower
    .replace(/\$/g, '')
    .replace(/\b(k|mil)\b/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (!cleaned) return null;

  const normalized = /^\d{1,3}([.,]\d{3})+$/.test(cleaned)
    ? cleaned.replace(/[.,]/g, '')
    : cleaned.replace(',', '.');
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * multiplier);
};

export const parseQuickCaptureText = (
  input: string,
  paymentSource: PaymentSource | null,
  now = new Date(),
): QuickCaptureParseResult => {
  const text = compactSpaces(input);

  if (!text) {
    return { payload: null, error: 'Escribe algo como "almuerzo 18000".' };
  }

  if (!paymentSource) {
    return { payload: null, error: 'Elige tarjeta, débito o efectivo para guardar.' };
  }

  const matches = Array.from(text.matchAll(amountPattern));
  const amountMatch = matches[matches.length - 1];
  const amount = amountMatch ? parseAmount(amountMatch[1]) : null;

  if (!amount) {
    return { payload: null, error: 'No encontré el monto. Usa algo como "almuerzo 18000".' };
  }

  const concept = compactSpaces(
    `${text.slice(0, amountMatch.index)} ${text.slice((amountMatch.index ?? 0) + amountMatch[0].length)}`
      .replace(/^[,.;:-]+|[,.;:-]+$/g, ''),
  );

  return {
    error: null,
    payload: {
      date: toApiDate(now),
      concept: concept || 'Gasto',
      amount,
      transaction_type: 'expense',
      status: 'confirmed',
      category_id: null,
      subcategory_id: null,
      source: 'manual',
      payment_source: paymentSource,
      credit_card_status: paymentSource === 'credit_card' ? 'pending' : null,
    },
  };
};
