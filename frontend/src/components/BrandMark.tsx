export function BrandMark({ size = 28, inverse = false }: { size?: number; inverse?: boolean }) {
  const bg = inverse ? '#fff' : 'var(--blue-500)';
  const fg = inverse ? 'var(--blue-500)' : '#fff';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill={bg} />
      <circle cx="11" cy="16" r="3" fill={fg} />
      <path d="M16.5 10.5a8 8 0 0 1 0 11" stroke={fg} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path
        d="M20.5 7a13 13 0 0 1 0 18"
        stroke={fg}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        opacity=".6"
      />
    </svg>
  );
}
