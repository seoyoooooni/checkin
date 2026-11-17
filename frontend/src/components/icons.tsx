import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const IconMic = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const IconSpeaker = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" stroke="none" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
  </svg>
);

export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={3} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconX = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={3} {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const IconAlert = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={3} {...p}>
    <path d="M12 7v6M12 17h.01" />
  </svg>
);

export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconSearch = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

export const IconPause = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8 5v14M16 5v14" strokeWidth={3} />
  </svg>
);

export const IconUser = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.6} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c.8-3.9 4.1-6.5 8-6.5s7.2 2.6 8 6.5" />
  </svg>
);

export const IconLock = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.6} {...p}>
    <rect x="4" y="10.5" width="16" height="10" rx="3" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M10 15.5h4" />
  </svg>
);

export const IconLogout = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.8} {...p}>
    <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7M10 12h10M17 8.5l3.5 3.5-3.5 3.5" />
  </svg>
);

export const IconBook = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.8} {...p}>
    <path d="M6.5 3.5H18a1 1 0 0 1 1 1V17H6.5A2.5 2.5 0 0 0 4 19.5v-13a3 3 0 0 1 2.5-3z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H19v-5" />
  </svg>
);
