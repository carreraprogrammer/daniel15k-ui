import { create } from 'zustand';

export const ACCENT_PRESETS = [
  { label: 'Dorado',    color: '#E6B656', rgb: '230, 182, 86' },
  { label: 'Bronce',    color: '#D17A3F', rgb: '209, 122, 63' },
  { label: 'Azul',      color: '#7CA6E0', rgb: '124, 166, 224' },
  { label: 'Lavanda',   color: '#9B8AC2', rgb: '155, 138, 194' },
  { label: 'Esmeralda', color: '#5FB58A', rgb: '95, 181, 138' },
];

const ACCENT_KEY = 'ascent-accent';

const getStoredAccent = () => {
  const stored = localStorage.getItem(ACCENT_KEY);
  return ACCENT_PRESETS.find((p) => p.color === stored) ?? ACCENT_PRESETS[0];
};

export const applyAccent = (preset: (typeof ACCENT_PRESETS)[number]) => {
  const root = document.documentElement;
  root.style.setProperty('--color-brand', preset.color);
  root.style.setProperty('--color-brand-rgb', preset.rgb);
  root.style.setProperty('--color-brand-hover', preset.color);
  root.style.setProperty('--color-brand-active', preset.color);
};

type AccentState = {
  preset: (typeof ACCENT_PRESETS)[number];
  setPreset: (preset: (typeof ACCENT_PRESETS)[number]) => void;
};

const initial = typeof localStorage !== 'undefined' ? getStoredAccent() : ACCENT_PRESETS[0];

export const useAccentStore = create<AccentState>((set) => ({
  preset: initial,
  setPreset(preset) {
    localStorage.setItem(ACCENT_KEY, preset.color);
    applyAccent(preset);
    set({ preset });
  },
}));

if (typeof document !== 'undefined') {
  applyAccent(initial);
}
