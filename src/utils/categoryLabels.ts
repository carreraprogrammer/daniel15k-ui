const singularFlexiblePattern = /\bdisc(?:re|res)ional\b/giu;
const pluralFlexiblePattern = /\bdisc(?:re|res)ionales\b/giu;

export const normalizeFlexibleLabel = (value?: string | null) => {
  if (!value) {
    return '';
  }

  return value
    .replace(pluralFlexiblePattern, (match) => (match[0] === match[0]?.toUpperCase() ? 'Flexibles' : 'flexibles'))
    .replace(singularFlexiblePattern, (match) => (match[0] === match[0]?.toUpperCase() ? 'Flexible' : 'flexible'));
};

interface CategoryDisplayNameInput {
  name?: string | null;
  code?: string | null;
  type?: string | null;
  fallback?: string;
}

export const getCategoryDisplayName = ({
  name,
  code,
  type,
  fallback = 'Sin categoría',
}: CategoryDisplayNameInput) => {
  if (code === 'discretionary' || type === 'discretionary') {
    return 'Flexible';
  }

  const normalized = normalizeFlexibleLabel(name);
  return normalized || fallback;
};