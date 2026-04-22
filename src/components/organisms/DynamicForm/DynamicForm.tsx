import { useEffect, useState } from 'react';
import { Button } from '../../atoms/Button';
import { DynamicField } from '../../molecules/DynamicField';
import { formService } from '../../../services/formService';
import type { ApiEnvelope, FormSchema, FormValues } from '../../../types/form.types';
import styles from './DynamicForm.module.css';

const buildValues = (schema: FormSchema, initialValues: FormValues): FormValues =>
  Object.fromEntries(
    (schema.fields ?? []).map((field) => [
      field.name,
      initialValues[field.name] ?? (field.type === 'checkbox' ? false : ''),
    ]),
  );

export const DynamicForm = ({
  schema,
  initialValues = {},
  onSuccess,
  onError,
  readOnly = false,
  submitLabel = 'Enviar',
}: {
  schema: FormSchema;
  initialValues?: FormValues;
  onSuccess?: (payload: ApiEnvelope<Record<string, unknown>>) => void;
  onError?: (error: unknown) => void;
  readOnly?: boolean;
  submitLabel?: string;
}) => {
  const [values, setValues] = useState<FormValues>(() => buildValues(schema, initialValues));
  const [errors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = schema.fields ?? [];

  useEffect(() => {
    setValues(buildValues(schema, initialValues));
  }, [initialValues, schema]);

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (readOnly) return;

        setIsSubmitting(true);

        try {
          const response = await formService.submit(schema, values);
          onSuccess?.(response);
        } catch (error) {
          onError?.(error);
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      {fields.map((field) => (
        <DynamicField
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
          error={errors[field.name]}
        />
      ))}
      {!readOnly ? <Button type="submit" label={submitLabel} loading={isSubmitting} fullWidth /> : null}
    </form>
  );
};
