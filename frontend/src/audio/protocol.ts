export const DIGIT_BASE = 18000;
export const DIGIT_STEP = 150;
export const START_FREQ = 19800;
export const REPEAT_FREQ = 19575;
export const SYMBOL_MS = 150;
export const GAP_MS = 80;
export const REPEAT_PAUSE_MS = 500;
export const CODE_LENGTH = 6;

export const digitFreq = (d: number) => DIGIT_BASE + d * DIGIT_STEP;

export interface Candidate {
  sym: string;
  f: number;
}

export const CANDIDATES: Candidate[] = [
  { sym: 'S', f: START_FREQ },
  { sym: 'R', f: REPEAT_FREQ },
  ...Array.from({ length: 10 }, (_, d) => ({ sym: String(d), f: digitFreq(d) })),
];

export function encodeSymbols(code: string): string[] {
  const out: string[] = [];
  let prevDigit = '';
  let prevSym = '';
  for (const d of code) {
    const sym = d === prevDigit && prevSym !== 'R' ? 'R' : d;
    out.push(sym);
    prevDigit = d;
    prevSym = sym;
  }
  return out;
}

export const symbolFreq = (sym: string) => (sym === 'R' ? REPEAT_FREQ : digitFreq(Number(sym)));

export function repeatDurationSec(len = CODE_LENGTH) {
  return (SYMBOL_MS * 2 + GAP_MS + len * (SYMBOL_MS + GAP_MS) + REPEAT_PAUSE_MS) / 1000;
}

type AudioContextCtor = typeof AudioContext;

export function getAudioContextCtor(): AudioContextCtor {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext || (w.webkitAudioContext as AudioContextCtor);
}
