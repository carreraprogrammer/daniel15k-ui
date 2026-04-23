import type { CategoryResource, Transaction } from '../types/finance.types';

export type BehaviorTone = 'committed' | 'necessary' | 'discretionary' | 'investment' | 'social' | 'income' | 'unknown';

export interface CategoryLookupItem {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  categoryType: string;
  categoryColor?: string;
  categoryIcon?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  subcategoryCode?: string;
  subcategoryIcon?: string;
}

export interface BehaviorSummary {
  totals: Record<BehaviorTone, number>;
  counts: Record<BehaviorTone, number>;
  expenseTotal: number;
  incomeTotal: number;
}

export interface BehaviorSignal {
  tone: BehaviorTone;
  title: string;
  message: string;
}

export const behaviorCopy: Record<BehaviorTone, { label: string; cue: string }> = {
  committed: { label: 'Comprometido', cue: 'Carga fija' },
  necessary: { label: 'Necesario', cue: 'Mantené control' },
  discretionary: { label: 'Discrecional', cue: 'Elegido por vos' },
  investment: { label: 'Inversión', cue: 'Construye futuro' },
  social: { label: 'Social', cue: 'Relación / vínculo' },
  income: { label: 'Ingreso', cue: 'Entrada de caja' },
  unknown: { label: 'Sin clasificar', cue: 'Revisar criterio' },
};

export const buildCategoryLookup = (categories: CategoryResource[]): Record<string, CategoryLookupItem> => {
  const lookup: Record<string, CategoryLookupItem> = {};

  categories.forEach((category) => {
    const categoryItem: CategoryLookupItem = {
      categoryId: String(category.id),
      categoryName: category.attributes.name ?? 'Sin categoría',
      categoryCode: category.attributes.code ?? 'unknown',
      categoryType: category.attributes.category_type ?? category.attributes.code ?? 'unknown',
      categoryColor: category.attributes.color,
      categoryIcon: category.attributes.icon,
    };

    lookup[`category:${categoryItem.categoryId}`] = categoryItem;

    category.relationships?.subcategories?.data?.forEach((subcategory) => {
      lookup[`subcategory:${subcategory.id}`] = {
        ...categoryItem,
        subcategoryId: String(subcategory.id),
        subcategoryName: subcategory.attributes?.name ?? 'Sin subcategoría',
        subcategoryCode: subcategory.attributes?.code ?? undefined,
        subcategoryIcon: subcategory.attributes?.icon ?? undefined,
      };
    });
  });

  return lookup;
};

export const resolveTransactionCategory = (
  transaction: Transaction,
  lookup: Record<string, CategoryLookupItem>,
): CategoryLookupItem => {
  const subcategoryId = transaction.relationships?.subcategory?.data?.id;
  const categoryId =
    transaction.relationships?.category?.data?.id ??
    (transaction.attributes.category_id != null ? String(transaction.attributes.category_id) : undefined);

  if (subcategoryId && lookup[`subcategory:${subcategoryId}`]) {
    return lookup[`subcategory:${subcategoryId}`];
  }

  if (categoryId && lookup[`category:${categoryId}`]) {
    return lookup[`category:${categoryId}`];
  }

  return {
    categoryId: '',
    categoryName: 'Sin categoría',
    categoryCode: 'unknown',
    categoryType: 'unknown',
  };
};

const behaviorTones: BehaviorTone[] = [
  'committed',
  'necessary',
  'discretionary',
  'investment',
  'social',
  'income',
  'unknown',
];

const isBehaviorTone = (value: string): value is BehaviorTone => behaviorTones.includes(value as BehaviorTone);

export const summarizeBehavior = (
  transactions: Transaction[],
  lookup: Record<string, CategoryLookupItem>,
): BehaviorSummary => {
  const totals = Object.fromEntries(behaviorTones.map((tone) => [tone, 0])) as Record<BehaviorTone, number>;
  const counts = Object.fromEntries(behaviorTones.map((tone) => [tone, 0])) as Record<BehaviorTone, number>;

  let expenseTotal = 0;
  let incomeTotal = 0;

  transactions.forEach((transaction) => {
    const resolved = resolveTransactionCategory(transaction, lookup);
    const tone = isBehaviorTone(resolved.categoryType) ? resolved.categoryType : 'unknown';
    const amount = Number(transaction.attributes.amount ?? 0);

    totals[tone] += amount;
    counts[tone] += 1;

    if (tone === 'income' || transaction.attributes.transaction_type === 'income') {
      incomeTotal += amount;
    } else {
      expenseTotal += amount;
    }
  });

  return { totals, counts, expenseTotal, incomeTotal };
};

export const buildBehaviorSignals = (summary: BehaviorSummary): BehaviorSignal[] => {
  const signals: BehaviorSignal[] = [];
  const discretionary = summary.totals.discretionary;
  const investment = summary.totals.investment;
  const committed = summary.totals.committed;
  const necessary = summary.totals.necessary;
  const social = summary.totals.social;
  const expenseBase = Math.max(summary.expenseTotal, 1);

  if (discretionary > 0 && discretionary > investment * 2) {
    signals.push({
      tone: 'discretionary',
      title: 'Fricción discrecional',
      message: `Tu gasto elegido va muy por encima de lo que está construyendo futuro este mes.`,
    });
  }

  if (investment === 0 && summary.expenseTotal > 0) {
    signals.push({
      tone: 'investment',
      title: 'Construcción en cero',
      message: 'Todavía no aparece gasto tipo inversión en el período. El sistema no está reforzando futuro.',
    });
  }

  if (committed / expenseBase >= 0.4) {
    signals.push({
      tone: 'committed',
      title: 'Carga fija alta',
      message: 'Tus obligaciones comprometidas ya pesan fuerte en el mes. Esto pide decisiones estructurales, no solo recortes pequeños.',
    });
  }

  if (necessary > discretionary && necessary > social) {
    signals.push({
      tone: 'necessary',
      title: 'Mes de mantenimiento',
      message: 'La mayor parte del gasto se está yendo a sostener el sistema actual. El margen para maniobrar es limitado.',
    });
  }

  if (social > discretionary && social > 0) {
    signals.push({
      tone: 'social',
      title: 'Peso relacional visible',
      message: 'Una parte relevante del gasto está yendo a vínculo y familia. Vale la pena verlo con conciencia, no como ruido.',
    });
  }

  if (!signals.length) {
    signals.push({
      tone: 'necessary',
      title: 'Presión estable',
      message: 'El mes no muestra una señal conductual extrema todavía. Úsalo para sostener criterio, no para relajarte.',
    });
  }

  return signals.slice(0, 3);
};
