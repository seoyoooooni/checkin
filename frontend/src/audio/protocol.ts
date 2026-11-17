export const SYMBOL_MS = 150;
export const GAP_MS = 80;
export const REPEAT_PAUSE_MS = 500;
export const CODE_LENGTH = 6;

export type BandId = 'normal' | 'high';

export interface Band {
  id: BandId;
  digitBase: number;
  digitStep: number;
  repeatFreq: number;
  startFreq: number;
}

export const BANDS: Record<BandId, Band> = {
  normal: { id: 'normal', digitBase: 18000, digitStep: 150, repeatFreq: 19575, startFreq: 19800 },
  high: { id: 'high', digitBase: 19900, digitStep: 90, repeatFreq: 20850, startFreq: 21000 },
};

export interface Candidate {
  sym: string;
  f: number;
}

export const candidatesOf = (band: Band): Candidate[] => [
  { sym: 'S', f: band.startFreq },
  { sym: 'R', f: band.repeatFreq },
  ...Array.from({ length: 10 }, (_, d) => ({ sym: String(d), f: band.digitBase + d * band.digitStep })),
];

export const symbolFreq = (band: Band, sym: string) =>
  sym === 'R' ? band.repeatFreq : band.digitBase + Number(sym) * band.digitStep;

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

type AudioContextCtor = typeof AudioContext;

export function getAudioContextCtor(): AudioContextCtor {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext || (w.webkitAudioContext as AudioContextCtor);
}
