import { api } from './api'
import { financeService } from './financeService'
import type { ExpenseCategory, OnbData, OnbExpense } from '../components/organisms/Onboarding/types'
import { buildContext, deriveCaseId, strategyFor } from '../components/organisms/Onboarding/ClosingScreen'
import type { CaseId } from '../components/organisms/Onboarding/ClosingScreen'

interface ParsedExpenseDTO {
  name: string
  amount: number
  cat: ExpenseCategory
  icon?: string
  is_credit?: boolean
  credit_kind?: string | null
}

export interface ParseExpensesInput {
  transcript?: string
  imageBase64?: string
}

const ICON_BY_CAT: Record<ExpenseCategory, string> = {
  committed: 'Home2',
  necessary: 'Cart',
  discretionary: 'Card',
  investment: 'Trend',
  social: 'Heart',
  income: 'Wallet',
}

const toOnbExpense = (dto: ParsedExpenseDTO, i: number): OnbExpense => ({
  id: `p${Date.now()}_${i}`,
  name: dto.name,
  amount: Math.round(dto.amount) || 0,
  cat: dto.cat,
  icon: dto.icon || ICON_BY_CAT[dto.cat] || 'Card',
  isCredit: dto.is_credit || false,
  creditKind: dto.credit_kind ?? undefined,
})

export const onboardingService = {
  /**
   * Sends a free-form dictation transcript or an extract photo to the backend,
   * which uses the agent to return structured, categorized expenses with credit
   * detection. Mirrors the conversational capture from the design (§6.1).
   */
  async parseExpenses(input: ParseExpensesInput): Promise<OnbExpense[]> {
    const { data } = await api.post('/api/v1/onboarding/parse_expenses', {
      transcript: input.transcript,
      image_base64: input.imageBase64,
    })
    const list: ParsedExpenseDTO[] = data?.data?.expenses ?? data?.expenses ?? []
    return list.map(toOnbExpense)
  },

  /**
   * Persists the captured onboarding profile to the finance domain on
   * completion: income source(s), recurring obligations (credits keep their
   * cuota + rate + due day; the balance is intentionally deferred to the coach),
   * and the financial context (derived phase + strategy).
   */
  async persist(data: OnbData): Promise<{ caseId: CaseId }> {
    const ctx = buildContext(data)
    const caseId = deriveCaseId(ctx)
    const nowIso = new Date().toISOString()

    // 0 · opening balance — seeds account.confirmed_balance as a confirmed inflow
    if (data.balance && data.balance > 0) {
      await financeService.createTransaction({
        date: nowIso.slice(0, 10),
        concept: 'Saldo inicial',
        amount: data.balance,
        transaction_type: 'income',
        status: 'confirmed',
        source: 'manual',
      })
    }

    // 1 · income source
    await financeService.createIncomeSource({
      name: 'Mi ingreso principal',
      expected_amount: ctx.income || (data.income.amount ?? data.income.floor ?? 0) || 0,
      expected_day_from: 1,
      expected_day_to: 5,
      classification: data.income.type === 'variable' ? 'variable' : 'base',
      cadence: CADENCE_MAP[data.income.cadence ?? 'mensual'] ?? 'monthly',
      is_variable: data.income.type === 'variable',
      last_confirmed_at: nowIso,
      active: true,
    })

    // 2 · recurring obligations (one per captured expense)
    await Promise.all(
      data.expenses.map((e) =>
        financeService.createRecurringObligation({
          name: e.name,
          amount: e.amount,
          due_day: e.dueDay ?? '',
          notes: e.isCredit ? creditNote(e) : undefined,
        }),
      ),
    )

    // 3 · financial context (derived phase + strategy)
    await financeService.updateFinancialContext({
      phase: PHASE_MAP[caseId],
      strategy: strategyFor(caseId) ?? 'snowball',
      reward_pct: 10,
      ...(ctx.hasDebt ? {} : { debts_confirmed_at: nowIso }),
    })

    return { caseId }
  },
}

const CADENCE_MAP: Record<string, 'monthly' | 'biweekly' | 'weekly' | 'irregular'> = {
  mensual: 'monthly',
  quincenal: 'biweekly',
  semanal: 'weekly',
  irregular: 'irregular',
}

const PHASE_MAP: Record<CaseId, string> = {
  starter: 'debt_payoff',
  debt: 'debt_payoff',
  emergency: 'emergency_fund',
  investing: 'investing',
}

function creditNote(e: OnbExpense): string {
  const parts = ['Crédito detectado en onboarding']
  if (e.rate) parts.push(`~${e.rate}%/mes`)
  if (e.dueDay) parts.push(`paga día ${e.dueDay}`)
  parts.push('saldo pendiente por confirmar')
  return parts.join(' · ')
}
