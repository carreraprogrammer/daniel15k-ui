import { create } from 'zustand';

export type ThemePreference = 'system' | 'dark' | 'light';
export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'app_theme';
const THEME_QUERY = '(prefers-color-scheme: dark)';

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'system' || value === 'dark' || value === 'light';

const getStoredTheme = (): ThemePreference => {
  if (typeof localStorage === 'undefined') return 'system';

  const stored = localStorage.getItem(THEME_KEY);
  return isThemePreference(stored) ? stored : 'system';
};

export const resolveThemeMode = (preference: ThemePreference): ThemeMode => {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'dark';

  return window.matchMedia(THEME_QUERY).matches ? 'dark' : 'light';
};

export const getThemeMediaQuery = () => {
  if (typeof window === 'undefined') return null;
  return window.matchMedia(THEME_QUERY);
};

export const applyThemeMode = (preference: ThemePreference) => {
  const mode = resolveThemeMode(preference);
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
};

type ThemeState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resetPreference: () => void;
};

const initialPreference = getStoredTheme();

export const useThemeStore = create<ThemeState>((set) => ({
  preference: initialPreference,
  setPreference(preference) {
    localStorage.setItem(THEME_KEY, preference);
    applyThemeMode(preference);
    set({ preference });
  },
  resetPreference() {
    localStorage.removeItem(THEME_KEY);
    applyThemeMode('system');
    set({ preference: 'system' });
  },
}));

export const resetThemePreference = () => {
  localStorage.removeItem(THEME_KEY);
  useThemeStore.setState({ preference: 'system' });
  applyThemeMode('system');
};

if (typeof document !== 'undefined') {
  applyThemeMode(initialPreference);
}
