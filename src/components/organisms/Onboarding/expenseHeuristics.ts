import type { ExpenseCategory, OnbExpense } from './types'

// Lightweight client-side classification for manually-typed expenses.
// Voice/photo capture go through the backend agent for richer parsing; this
// keeps single manual entries useful without a round-trip.

const CREDIT_HINTS = ['cuota', 'tarjeta', 'crédito', 'credito', 'préstamo', 'prestamo', 'banco', 'financiera', 'leasing', 'libranza']
const SOCIAL_HINTS = ['mamá', 'mama', 'papá', 'papa', 'familia', 'hijo', 'hija', 'mando', 'envío', 'envio', 'remesa']
const DISCRETIONARY_HINTS = ['netflix', 'spotify', 'disney', 'hbo', 'max', 'youtube', 'suscrip', 'gym', 'gimnasio', 'juego']
const NECESSARY_HINTS = ['mercado', 'comida', 'transporte', 'gasolina', 'salud', 'eps', 'medicina', 'colegio', 'educación', 'educacion']
const COMMITTED_HINTS = ['arriendo', 'renta', 'hipoteca', 'servicios', 'luz', 'agua', 'gas', 'internet', 'celular', 'administración', 'administracion', 'seguro']

const ICON_BY_CAT: Record<ExpenseCategory, string> = {
  committed: 'Home2',
  necessary: 'Cart',
  discretionary: 'Card',
  investment: 'Trend',
  social: 'Heart',
  income: 'Wallet',
}

const matches = (text: string, hints: string[]) => hints.some((h) => text.includes(h))

export function guessExpense(name: string, amount: number): OnbExpense {
  const t = name.toLowerCase()
  const isCredit = matches(t, CREDIT_HINTS)

  let cat: ExpenseCategory = 'necessary'
  if (isCredit || matches(t, COMMITTED_HINTS)) cat = 'committed'
  else if (matches(t, SOCIAL_HINTS)) cat = 'social'
  else if (matches(t, DISCRETIONARY_HINTS)) cat = 'discretionary'
  else if (matches(t, NECESSARY_HINTS)) cat = 'necessary'

  let icon = ICON_BY_CAT[cat]
  if (t.includes('carro') || t.includes('moto') || t.includes('vehíc') || t.includes('vehic')) icon = 'Car'
  else if (matches(t, SOCIAL_HINTS)) icon = 'Heart'
  else if (isCredit) icon = 'Card'

  return {
    id: `m${Date.now()}`,
    name,
    amount,
    cat,
    icon,
    isCredit,
    creditKind: isCredit ? 'Crédito' : undefined,
  }
}
