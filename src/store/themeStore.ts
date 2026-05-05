import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'app_theme';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'dark' || value === 'light';

const getStoredTheme = (): ThemeMode => {
  if (typeof localStorage === 'undefined') return 'dark';

  const stored = localStorage.getItem(THEME_KEY);
  return isThemeMode(stored) ? stored : 'dark';
};

export const applyThemeMode = (mode: ThemeMode) => {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
};

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const initialMode = getStoredTheme();

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  setMode(mode) {
    localStorage.setItem(THEME_KEY, mode);
    applyThemeMode(mode);
    set({ mode });
  },
}));

if (typeof document !== 'undefined') {
  applyThemeMode(initialMode);
}
