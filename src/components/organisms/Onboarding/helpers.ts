export const fmtCOP = (n: number | '' | null | undefined): string => {
  if (n == null || n === '' || isNaN(Number(n))) return ''
  return Number(n).toLocaleString('es-CO')
}

export const onlyDigits = (s: string): string => (s || '').replace(/[^\d]/g, '')

export const parseMoney = (v: string): number | null => {
  const d = onlyDigits(v)
  return d ? Number(d) : null
}
