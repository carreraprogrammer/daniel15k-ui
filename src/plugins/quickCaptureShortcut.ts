import { registerPlugin } from '@capacitor/core';
import type { PaymentSource } from '../types/finance.types';

interface PendingQuickCaptureLaunch {
  shouldOpen?: boolean;
  paymentSource?: PaymentSource;
}

interface QuickCaptureShortcutPlugin {
  getPendingLaunch(): Promise<PendingQuickCaptureLaunch>;
}

export const QuickCaptureShortcut = registerPlugin<QuickCaptureShortcutPlugin>('QuickCaptureShortcut');
