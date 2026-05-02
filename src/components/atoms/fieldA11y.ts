export interface FieldA11yState {
  describedBy?: string;
  errorId: string;
  hintId: string;
  invalid: boolean;
}

export const getFieldA11yState = ({
  name,
  error,
  hint,
}: {
  name: string;
  error?: string;
  hint?: string;
}): FieldA11yState => {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const invalid = Boolean(error);

  if (invalid) {
    return {
      describedBy: errorId,
      errorId,
      hintId,
      invalid,
    };
  }

  if (hint) {
    return {
      describedBy: hintId,
      errorId,
      hintId,
      invalid,
    };
  }

  return {
    describedBy: undefined,
    errorId,
    hintId,
    invalid,
  };
};