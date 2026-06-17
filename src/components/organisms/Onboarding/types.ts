import type { Persona } from '../../../store/buddyStore'

// ── Capture state for the onboarding flow ──────────────────────────────────
// Mirrors the design handoff (onboarding-app.jsx · freshData) and maps to the
// backend on completion: income_sources, recurring_obligations, debts,
// financial_context.

export type ExpenseCategory =
  | 'committed'
  | 'necessary'
  | 'discretionary'
  | 'investment'
  | 'social'
  | 'income'

export interface OnbExpense {
  id: string
  name: string
  amount: number
  cat: ExpenseCategory
  icon: string
  /** Detected credit line — triggers the inline coach follow-up. */
  isCredit?: boolean
  creditKind?: string
  /** Monthly interest rate (%). `null` when the user doesn't know it. */
  rate?: string | null
  dueDay?: number | null
  resolved?: boolean
}

export type IncomeType = 'fixed' | 'variable' | null
export type Cadence = 'mensual' | 'quincenal' | 'semanal' | 'irregular' | null

export interface OnbData {
  coach: Persona | null
  motivation: { chips: string[]; note: string }
  /** confirmed_balance — money on hand today. */
  balance: number | null
  fund: { has: boolean | null; amount: number | null }
  expenses: OnbExpense[]
  income: {
    type: IncomeType
    amount: number | null
    /** Reliable floor for variable income — we plan on this, never the average. */
    floor: number | null
    cadence: Cadence
    examples: Array<number | ''>
  }
}

export function freshData(): OnbData {
  return {
    coach: null,
    motivation: { chips: [], note: '' },
    balance: null,
    fund: { has: null, amount: null },
    expenses: [],
    income: { type: null, amount: null, floor: null, cadence: null, examples: [] },
  }
}

export interface ScreenProps {
  data: OnbData
  update: (patch: Partial<OnbData>) => void
  coach: Persona
  error?: string
}
