import type { ReactNode } from 'react';
import { IconMic } from '../../components/icons';

export function Hero({
  visual,
  title,
  desc,
  children,
}: {
  visual: ReactNode;
  title: string;
  desc: string;
  children?: ReactNode;
}) {
  return (
    <section className="hero">
      <div className="hero-visual">{visual}</div>
      <h1 className="mobile-headline hero-title">{title}</h1>
      <p className="mobile-desc hero-desc">{desc}</p>
      {children && <div className="hero-extra">{children}</div>}
    </section>
  );
}

export function Pulse({ on }: { on: boolean }) {
  return (
    <div className={`pulse-wrap ${on ? 'on' : 'off'}`} style={{ width: 96, height: 96 }}>
      <span className="pulse-ring" />
      <span className="pulse-ring" />
      <span className="pulse-ring" />
      <span className="pulse-core" style={{ width: 96, height: 96, background: on ? undefined : 'var(--blue-500)' }}>
        <IconMic size={40} />
      </span>
    </div>
  );
}

export function ResultIcon({ tone, icon }: { tone: 'green' | 'orange' | 'blue' | 'grey' | 'red'; icon: ReactNode }) {
  return <div className={`result-icon tone-${tone}`}>{icon}</div>;
}

export function SignalBars({ snr }: { snr: number }) {
  const steps = [6, 12, 18, 24, 30];
  return (
    <div className="bars">
      {steps.map((s, i) => (
        <i key={s} className={snr >= s ? 'on' : ''} style={{ height: 8 + i * 4 }} />
      ))}
    </div>
  );
}
