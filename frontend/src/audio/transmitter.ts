import {
  GAP_MS,
  REPEAT_PAUSE_MS,
  START_FREQ,
  SYMBOL_MS,
  encodeSymbols,
  getAudioContextCtor,
  symbolFreq,
} from './protocol';

const LOOKAHEAD_SEC = 1.5;
const TICK_MS = 100;
const RAMP_SEC = 0.01;

export class UltrasonicTransmitter {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private volume = 0.7;

  constructor(private readonly getCode: () => string | null) {}

  get running() {
    return this.timer !== null;
  }

  async start() {
    if (this.running) return;
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession) {
      try {
        nav.audioSession.type = 'playback';
      } catch {}
    }
    if (!this.ctx) {
      const AC = getAudioContextCtor();
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.03);
      const old = this.master;
      setTimeout(() => old.disconnect(), 60);
    }
    this.master = null;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    }
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD_SEC) {
      const code = this.getCode();
      if (!code) {
        this.nextTime += 0.25;
        continue;
      }
      this.nextTime = this.scheduleCode(code, this.nextTime);
    }
  }

  private scheduleCode(code: string, t: number) {
    const sym = SYMBOL_MS / 1000;
    const gap = GAP_MS / 1000;
    this.tone(START_FREQ, t, sym * 2);
    t += sym * 2 + gap;
    for (const s of encodeSymbols(code)) {
      this.tone(symbolFreq(s), t, sym);
      t += sym + gap;
    }
    return t + REPEAT_PAUSE_MS / 1000;
  }

  private tone(f: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + RAMP_SEC);
    g.gain.setValueAtTime(1, t + dur - RAMP_SEC);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}
