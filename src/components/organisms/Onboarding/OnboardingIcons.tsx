// Inline SVG icons (24px). Style: line, 1.7 stroke, calm.
// Ported verbatim from the ASCENT design handoff (icons.jsx) so the onboarding
// renders pixel-faithful to the mockup, independent of the app's ionicons set.

interface IconProps {
  size?: number
  stroke?: string
}

const I = ({ children, size = 22, stroke = 'currentColor' }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

export const Icon = {
  Home: (p: IconProps) => <I {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></I>,
  Flow: (p: IconProps) => <I {...p}><path d="M3 7c4 0 4 5 9 5s5-5 9-5" /><path d="M3 17c4 0 4-5 9-5s5 5 9 5" /></I>,
  Wallet: (p: IconProps) => <I {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12h3" /><path d="M3 9V7a2 2 0 0 1 2-2h11" /></I>,
  Plus: (p: IconProps) => <I {...p}><path d="M12 5v14M5 12h14" /></I>,
  Coach: (p: IconProps) => <I {...p}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /><circle cx="19" cy="19" r="2" /></I>,
  Bell: (p: IconProps) => <I {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z" /><path d="M10 21h4" /></I>,
  Search: (p: IconProps) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></I>,
  Right: (p: IconProps) => <I {...p}><path d="M9 6l6 6-6 6" /></I>,
  Left: (p: IconProps) => <I {...p}><path d="M15 6l-6 6 6 6" /></I>,
  Close: (p: IconProps) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>,
  Check: (p: IconProps) => <I {...p}><path d="M5 12l4 4 10-10" /></I>,
  Flame: (p: IconProps) => <I {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-5 2 1 3 2 4 0z" /></I>,
  Sliders: (p: IconProps) => <I {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="15" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></I>,
  Calendar: (p: IconProps) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></I>,
  Mic: (p: IconProps) => <I {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></I>,
  Target: (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></I>,
  Trend: (p: IconProps) => <I {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></I>,
  Home2: (p: IconProps) => <I {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></I>,
  Card: (p: IconProps) => <I {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 11h18" /></I>,
  Cart: (p: IconProps) => <I {...p}><path d="M3 4h2l2.5 11h11l2-8H6" /><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></I>,
  Car: (p: IconProps) => <I {...p}><path d="M4 14l1.5-5h13L20 14M4 14v5h3v-2h10v2h3v-5" /><circle cx="7" cy="14" r="1" /><circle cx="17" cy="14" r="1" /></I>,
  Heart: (p: IconProps) => <I {...p}><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" /></I>,
} as const

export type IconName = keyof typeof Icon
