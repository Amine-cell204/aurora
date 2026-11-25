class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(
    freq: number,
    duration = 0.08,
    type: OscillatorType = 'sine',
    volume = 0.08,
    slideTo?: number
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public click(): void {
    this.playTone(540, 0.045, 'sine', 0.05, 360);
  }

  public jump(): void {
    this.playTone(260, 0.14, 'triangle', 0.09, 580);
  }

  public coin(): void {
    this.playTone(880, 0.08, 'sine', 0.08);
    setTimeout(() => this.playTone(1320, 0.14, 'sine', 0.08), 55);
  }

  public hit(): void {
    this.playTone(150, 0.16, 'sawtooth', 0.09, 60);
  }

  public win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.22, 'triangle', 0.09), i * 85);
    });
  }
}

export const soundFx = new SoundEngine();
