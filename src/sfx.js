// Tiny WebAudio sound effects (no asset files). Muted state is toggleable.
export class Sfx {
  constructor() { this.muted = false; this.ctx = null; }
  _tone(freq, dur = 0.12, type = "sine", gain = 0.08, delay = 0) {
    if (this.muted) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* audio unavailable */ }
  }
  tick() { this._tone(660, 0.08, "square", 0.04); }
  shutter() { this._tone(220, 0.18, "sawtooth", 0.07); }
  snap() { this._tone(880, 0.09, "triangle", 0.09); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.18, "triangle", 0.09, i * 0.09)); }
}
