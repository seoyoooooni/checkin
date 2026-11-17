import { CANDIDATES, CODE_LENGTH, getAudioContextCtor } from './protocol';

export type ReceiverErrorCode = 'insecure' | 'denied' | 'no-device' | 'low-sample-rate' | 'unknown';

export class ReceiverError extends Error {
  constructor(
    public readonly code: ReceiverErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface ReceiverOptions {
  onCode: (code: string) => void;
  onLevel?: (snrDb: number) => void;
  onProgress?: (digits: number) => void;
  threshold?: number;
  codeLength?: number;
}

const MIN_FRAMES = 3;
const RESET_MS = 1500;

export class UltrasonicReceiver {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private data: Float32Array<ArrayBuffer> = new Float32Array(0);
  private binHz = 0;
  private frame = 0;
  private run: { sym: string | null; frames: number } = { sym: null, frames: 0 };
  private decoder: { reading: boolean; digits: string[]; lastTime: number } = {
    reading: false,
    digits: [],
    lastTime: 0,
  };
  private readonly threshold: number;
  private readonly codeLength: number;

  constructor(private readonly opts: ReceiverOptions) {
    this.threshold = opts.threshold ?? 20;
    this.codeLength = opts.codeLength ?? CODE_LENGTH;
  }

  get running() {
    return this.ctx !== null;
  }

  async start() {
    if (this.running) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new ReceiverError('insecure');
    }
    const AC = getAudioContextCtor();
    const ctx = new AC();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      void ctx.close();
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new ReceiverError('denied');
      if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new ReceiverError('no-device');
      throw new ReceiverError('unknown', String(e));
    }

    await ctx.resume();
    if (ctx.sampleRate / 2 < 20000) {
      this.stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      throw new ReceiverError('low-sample-rate');
    }

    const src = ctx.createMediaStreamSource(this.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    analyser.minDecibels = -130;
    analyser.maxDecibels = 0;
    src.connect(analyser);

    this.ctx = ctx;
    this.analyser = analyser;
    this.data = new Float32Array(analyser.frequencyBinCount);
    this.binHz = ctx.sampleRate / analyser.fftSize;
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this.run = { sym: null, frames: 0 };
    this.decoder = { reading: false, digits: [], lastTime: 0 };
  }

  private binOf(f: number) {
    return Math.round(f / this.binHz);
  }

  private peakAt(f: number) {
    const b = this.binOf(f);
    let m = -Infinity;
    for (let i = b - 1; i <= b + 1; i++) {
      if (i >= 0 && i < this.data.length) m = Math.max(m, this.data[i]);
    }
    return m;
  }

  private noiseFloor() {
    const a = this.binOf(16000);
    const b = Math.min(this.binOf(21000), this.data.length - 1);
    const arr: number[] = [];
    for (let i = a; i <= b; i++) if (Number.isFinite(this.data[i])) arr.push(this.data[i]);
    if (!arr.length) return -130;
    arr.sort((x, y) => x - y);
    return arr[Math.floor(arr.length / 2)];
  }

  private loop = () => {
    if (!this.analyser) return;
    this.analyser.getFloatFrequencyData(this.data);
    const floor = this.noiseFloor();

    let sym: string | null = null;
    let symSnr = -Infinity;
    for (const c of CANDIDATES) {
      const s = this.peakAt(c.f) - floor;
      if (s > symSnr) {
        symSnr = s;
        sym = c.sym;
      }
    }
    if (symSnr < this.threshold) sym = null;
    this.feed(sym);

    this.frame++;
    if (this.opts.onLevel && this.frame % 6 === 0) this.opts.onLevel(Math.max(0, symSnr));
    this.raf = requestAnimationFrame(this.loop);
  };

  private feed(sym: string | null) {
    if (sym === this.run.sym) {
      this.run.frames++;
      if (this.run.frames === MIN_FRAMES && sym !== null) this.onSymbol(sym);
      return;
    }
    this.run = { sym, frames: 1 };
  }

  private onSymbol(sym: string) {
    const now = performance.now();
    const d = this.decoder;
    if (d.reading && now - d.lastTime > RESET_MS) d.reading = false;
    d.lastTime = now;

    if (sym === 'S') {
      this.decoder = { reading: true, digits: [], lastTime: now };
      this.opts.onProgress?.(0);
      return;
    }
    if (!d.reading) return;
    if (sym === 'R') {
      if (!d.digits.length) {
        d.reading = false;
        return;
      }
      d.digits.push(d.digits[d.digits.length - 1]);
    } else {
      d.digits.push(sym);
    }
    this.opts.onProgress?.(d.digits.length);
    if (d.digits.length === this.codeLength) {
      d.reading = false;
      this.opts.onCode(d.digits.join(''));
    }
  }
}
