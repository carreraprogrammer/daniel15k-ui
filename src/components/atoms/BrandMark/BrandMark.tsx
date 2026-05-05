import styles from './BrandMark.module.css';

export interface BrandMarkProps {
  variant?: 'principal' | 'monoline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const principalSvg = (
  <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="brandmark-bg" x1="512" y1="64" x2="512" y2="960" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#060606" />
        <stop offset="0.48" stopColor="#111111" />
        <stop offset="0.78" stopColor="#7C2D12" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>

      <radialGradient
        id="brandmark-sunGlow"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(512 370) rotate(90) scale(220)"
      >
        <stop offset="0" stopColor="#FFF7D6" />
        <stop offset="0.55" stopColor="#FDBA74" />
        <stop offset="1" stopColor="#FDBA74" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="brandmark-sunDisc" x1="512" y1="250" x2="512" y2="470" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFF8DB" />
        <stop offset="1" stopColor="#FED7AA" />
      </linearGradient>

      <linearGradient id="brandmark-mountainBack" x1="256" y1="540" x2="820" y2="760" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#312E81" />
        <stop offset="1" stopColor="#18120A" />
      </linearGradient>

      <linearGradient id="brandmark-mountainFront" x1="360" y1="520" x2="760" y2="920" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#101010" />
        <stop offset="1" stopColor="#030712" />
      </linearGradient>

      <clipPath id="brandmark-clip">
        <rect x="64" y="64" width="896" height="896" rx="220" />
      </clipPath>
    </defs>

    <rect x="64" y="64" width="896" height="896" rx="220" fill="url(#brandmark-bg)" />

    <g clipPath="url(#brandmark-clip)">
      <circle cx="512" cy="370" r="220" fill="url(#brandmark-sunGlow)" />
      <circle cx="512" cy="370" r="112" fill="url(#brandmark-sunDisc)" />
      <path
        d="M64 760C180 710 260 650 340 590C395 548 445 520 512 520C585 520 648 554 720 608C798 666 866 717 960 756V960H64V760Z"
        fill="url(#brandmark-mountainBack)"
        opacity="0.72"
      />
      <path
        d="M180 960L470 630C492 606 532 606 554 630L620 699C639 719 671 719 690 699L806 575L960 960H180Z"
        fill="url(#brandmark-mountainFront)"
      />
      <path
        d="M470 630L554 630L620 699L690 699L806 575L732 724L620 830L526 736L470 630Z"
        fill="#18120A"
        opacity="0.32"
      />
      <circle cx="806" cy="575" r="18" fill="#F8FAFC" />
      <path
        d="M180 640C292 600 390 570 512 570C642 570 746 603 860 650"
        stroke="#FFFFFF"
        strokeOpacity="0.10"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

const monolineSvg = (
  <svg viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="64" y="64" width="896" height="896" rx="220" fill="#050505" />
    <circle cx="512" cy="360" r="110" stroke="#FCD34D" strokeWidth="6" fill="none" opacity="0.9" />
    <path
      d="M200 720L420 520L600 680L780 500"
      stroke="#E5E7EB"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M200 720H820" stroke="#9CA3AF" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
    <circle cx="780" cy="500" r="16" fill="#F9FAFB" />
  </svg>
);

export const BrandMark = ({ variant = 'monoline', size = 'md', className }: BrandMarkProps) => (
  <span className={[styles.brandMark, styles[size], className ?? ''].filter(Boolean).join(' ')}>
    {variant === 'principal' ? principalSvg : monolineSvg}
  </span>
);
