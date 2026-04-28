import { useEffect, useRef, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { TransactionComposer } from '../../organisms/TransactionComposer/TransactionComposer';
import { BrandMark } from '../../atoms/BrandMark/BrandMark';
import { financeService } from '../../../services/financeService';
import type { CategoryResource, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import styles from './QuickCapturePage.module.css';

export const QuickCapturePage = () => {
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [saving, setSaving] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    financeService.fetchCategories().then((res) => setCategories(res.data)).catch(() => null);
  }, []);

  useEffect(() => {
    if (successCount > 0) {
      const t = setTimeout(() => setSuccessCount(0), 2000);
      return () => clearTimeout(t);
    }
  }, [successCount]);

  const handleCreate = async (payload: TransactionCreatePayload) => {
    setSaving(true);
    try {
      await financeService.createTransaction({ ...payload, source: 'manual' });
      setSuccessCount((n) => n + 1);
      inputRef.current?.querySelector('input')?.focus();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, payload: TransactionUpdatePayload) => {
    setSaving(true);
    try {
      await financeService.updateTransaction(id, payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className={styles.content}>
        <div className={styles.wrapper}>
          <header className={styles.header}>
            <BrandMark />
            {successCount > 0 && (
              <span className={styles.successBadge}>
                ✓ Guardado
              </span>
            )}
          </header>

          <div ref={inputRef} className={styles.composerWrap}>
            <TransactionComposer
              categories={categories}
              loading={saving}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};
