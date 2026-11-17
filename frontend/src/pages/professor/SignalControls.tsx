import type { CSSProperties } from 'react';
import type { BandId } from '../../audio/protocol';

const BAND_KEY = 'pulsein-band';
export const DEFAULT_VOLUME = 40;

export function loadBand(): BandId {
  try {
    return localStorage.getItem(BAND_KEY) === 'high' ? 'high' : 'normal';
  } catch {
    return 'normal';
  }
}

export function saveBand(band: BandId) {
  try {
    localStorage.setItem(BAND_KEY, band);
  } catch {}
}

const BAND_OPTIONS: { id: BandId; label: string; range: string }[] = [
  { id: 'normal', label: '기본', range: '18–19.8kHz' },
  { id: 'high', label: '높게', range: '19.9–21kHz' },
];

interface Props {
  volume: number;
  onVolume: (v: number) => void;
  band: BandId;
  onBand: (b: BandId) => void;
}

export function SignalControls({ volume, onVolume, band, onBand }: Props) {
  return (
    <div className="signal-controls">
      <div>
        <div className="slot-head">
          <span>음량</span>
          <span className="num">{volume}%</span>
        </div>
        <input
          type="range"
          className="slider"
          min={5}
          max={100}
          value={volume}
          style={{ '--fill': `${((volume - 5) / 95) * 100}%` } as CSSProperties}
          onChange={(e) => onVolume(Number(e.target.value))}
        />
      </div>
      <div>
        <div className="slot-head">
          <span>음높이</span>
          <span className="num">{BAND_OPTIONS.find((o) => o.id === band)?.range}</span>
        </div>
        <div className="segmented">
          {BAND_OPTIONS.map((o) => (
            <button key={o.id} type="button" className={band === o.id ? 'active' : ''} onClick={() => onBand(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
