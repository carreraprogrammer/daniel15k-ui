import { describe, expect, it } from 'vitest';
import { parseQuickCaptureText } from './quickCaptureParser';

const now = new Date(2026, 4, 7);

describe('parseQuickCaptureText', () => {
  it('builds an expense from concept and plain amount', () => {
    const result = parseQuickCaptureText('almuerzo 18000', 'credit_card', now);

    expect(result.error).toBeNull();
    expect(result.payload).toMatchObject({
      date: '07/05/2026',
      concept: 'almuerzo',
      amount: 18000,
      transaction_type: 'expense',
      status: 'confirmed',
      payment_source: 'credit_card',
      credit_card_status: 'pending',
    });
  });

  it('supports currency separators and keeps the remaining text as concept', () => {
    const result = parseQuickCaptureText('uber a la oficina $18.500', 'debit', now);

    expect(result.payload?.concept).toBe('uber a la oficina');
    expect(result.payload?.amount).toBe(18500);
    expect(result.payload?.credit_card_status).toBeNull();
  });

  it('supports shorthand amounts with mil', () => {
    const result = parseQuickCaptureText('cafe 12 mil', 'cash', now);

    expect(result.payload?.concept).toBe('cafe');
    expect(result.payload?.amount).toBe(12000);
  });

  it('requires a payment source', () => {
    const result = parseQuickCaptureText('almuerzo 18000', null, now);

    expect(result.payload).toBeNull();
    expect(result.error).toBe('Elige tarjeta, débito o efectivo para guardar.');
  });
});
