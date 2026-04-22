import { useEffect, useRef, useState } from 'react';
import { financeService } from '../services/financeService';
import type { WizardData } from '../types/finance.types';

interface UseWizardDataOptions {
  /** Only fetches when true — prevents network calls until the wizard is about to open. */
  enabled: boolean;
}

interface UseWizardDataResult {
  wizardData: WizardData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export const useWizardData = ({ enabled }: UseWizardDataOptions): UseWizardDataResult => {
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether we have already fetched so we don't refetch on every render
  // while `enabled` stays true.
  const fetchedRef = useRef(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeService.fetchWizardData();
      setWizardData(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar los datos del asistente de presupuesto.',
      );
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    fetchedRef.current = false;
    void load();
  };

  useEffect(() => {
    if (!enabled) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void load();
  }, [enabled]);

  return { wizardData, loading, error, reload };
};
