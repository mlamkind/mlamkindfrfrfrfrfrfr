// Web Audio API Synthesizer for Zonyx+ Robot Interactive Audio Feedback

export class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zonyx_sound_enabled") || localStorage.getItem("p1_sound_enabled");
      if (saved !== null) {
        this.enabled = saved === "true";
      }
    }
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleSound(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("p1_sound_enabled", String(this.enabled));
    }
    if (this.enabled) {
      this.playClick();
    }
    return this.enabled;
  }

  public playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playServoMove() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, this.ctx.currentTime + 0.08);
      osc.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 0.15);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {
      // Audio fallback
    }
  }

  public playRobotChirp(mood: string = "happy") {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";

      if (mood === "happy" || mood === "wink") {
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1320, t + 0.22);
      } else if (mood === "surprised") {
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
      } else if (mood === "roasting" || mood === "sassy") {
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(350, t + 0.12);
        osc.frequency.linearRampToValueAtTime(200, t + 0.24);
      } else if (mood === "thinking") {
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.linearRampToValueAtTime(580, t + 0.08);
        osc.frequency.linearRampToValueAtTime(520, t + 0.16);
      } else {
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.linearRampToValueAtTime(700, t + 0.1);
      }

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      // Audio fallback
    }
  }

  public playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + index * 0.07;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.07, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {
      // Audio fallback
    }
  }

  public playBeep(freq: number = 640, duration: number = 0.05) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  }

  public playBoop() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Audio fallback
    }
  }

  public playDance() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + i * 0.08;
        osc.type = i % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.14);
      });
    } catch {
      // Audio fallback
    }
  }

  public playPowerDown() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(500, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Audio fallback
    }
  }

  public playHighFive() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [587.33, 880, 1174.66, 1760].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t + i * 0.04);
        gain.gain.setValueAtTime(0.08, t + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.04);
        osc.stop(t + i * 0.04 + 0.18);
      });
    } catch {}
  }

  public playGiggle() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [650, 780, 650, 880].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + i * 0.05);
        gain.gain.setValueAtTime(0.07, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.08);
      });
    } catch {}
  }

  // --- GOOGLE EASTER EGG & RETRO SOUND EFFECTS ---

  /** Classic Arcade / Mario style coin pickup chime */
  public playCoin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Note 1: B5 (987.77 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, t);
      gain1.gain.setValueAtTime(0.09, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.09);

      // Note 2: E6 (1318.51 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, t + 0.08);
      gain2.gain.setValueAtTime(0.12, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.08);
      osc2.stop(t + 0.38);
    } catch {}
  }

  /** Retro Arcade Sci-Fi Laser pew-pew */
  public playLaser() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1500, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, t);
      filter.frequency.linearRampToValueAtTime(400, t + 0.15);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  /** "Do a barrel roll" dynamic whooshing spin sound */
  public playBarrelRoll() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Resonant whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(820, t + 0.6);
      osc.frequency.exponentialRampToValueAtTime(220, t + 1.4);

      filter.type = "bandpass";
      filter.Q.setValueAtTime(3.5, t);
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.linearRampToValueAtTime(1600, t + 0.6);
      filter.frequency.linearRampToValueAtTime(350, t + 1.4);

      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.45);
    } catch {}
  }

  /** Konami Code 8-bit NES Victory Fanfare */
  public play8BitFanfare() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Arpeggiated chip chord
      const notes = [
        { f: 523.25, d: 0.07 }, // C5
        { f: 659.25, d: 0.07 }, // E5
        { f: 783.99, d: 0.07 }, // G5
        { f: 1046.5, d: 0.07 }, // C6
        { f: 1318.5, d: 0.09 }, // E6
        { f: 1567.9, d: 0.18 }, // G6
        { f: 2093.0, d: 0.35 }, // C7
      ];

      let offset = 0;
      notes.forEach(({ f, d }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f, t + offset);
        gain.gain.setValueAtTime(0.06, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + d);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + d);
        offset += d * 0.75;
      });
    } catch {}
  }

  /** Ninja Katana Slash & Shinobi Strike */
  public playNinjaSlash() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // 1. Blade white-noise / high metallic sweep whoosh
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(3600, t);
      filter.frequency.exponentialRampToValueAtTime(500, t + 0.2);
      filter.Q.setValueAtTime(5.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.21);

      // 2. High metallic sword gleam ring
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(2600, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(1300, t + 0.3);
      oscGain.gain.setValueAtTime(0.08, t + 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t + 0.04);
      osc.stop(t + 0.35);
    } catch {}
  }

  /** Cyber Matrix Glitch / Digital Noise */
  public playGlitch() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [320, 890, 440, 1200, 260, 950].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i % 2 === 0 ? "square" : "sawtooth";
        osc.frequency.setValueAtTime(freq, t + i * 0.035);
        gain.gain.setValueAtTime(0.06, t + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.035);
        osc.stop(t + i * 0.035 + 0.04);
      });
    } catch {}
  }

  /** Funky Party Disco Riff */
  public playPartyDisco() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Funky brass synth riff: A4, C5, D5, E5, G5, A5
      const riff = [440, 523.25, 587.33, 659.25, 783.99, 880];
      riff.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        const start = t + idx * 0.07;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch {}
  }

  /** Triumphant Ta-Da Brass Chord */
  public playTaDa() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Staccato prep
      const prep = this.ctx.createOscillator();
      const prepGain = this.ctx.createGain();
      prep.type = "triangle";
      prep.frequency.setValueAtTime(440, t);
      prepGain.gain.setValueAtTime(0.08, t);
      prepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      prep.connect(prepGain);
      prepGain.connect(this.ctx.destination);
      prep.start(t);
      prep.stop(t + 0.08);

      // Major Chord burst (C5 + E5 + G5 + C6)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + 0.1);
        gain.gain.setValueAtTime(0.07, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + 0.1);
        osc.stop(t + 0.65);
      });
    } catch {}
  }

  /** Gentle Companion Robot Purr */
  public playPurr() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(110, t);

      lfo.type = "sine";
      lfo.frequency.setValueAtTime(24, t); // 24Hz purr rumble
      lfoGain.gain.setValueAtTime(0.04, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      lfo.start(t);
      osc.stop(t + 0.8);
      lfo.stop(t + 0.8);
    } catch {}
  }

  /** Zero Gravity float space harmonic */
  public playZeroGravity() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [440, 554.37, 659.25, 830.61].forEach((f, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        const start = t + i * 0.12;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.06, start + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.9);
      });
    } catch {}
  }
}

export const soundFX = new SoundFX();
