export interface RelaxTrack {
  id: number;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
}

export const RELAX_TRACKS: RelaxTrack[] = [
  {
    id: 0,
    title: "Brisa Serena",
    subtitle: "Piano Elétrico & Sons Suaves de Ambiente",
    url: "./audio/relax-ambient.mp3",
    icon: "🌿"
  },
  {
    id: 1,
    title: "Dedução Tranquila",
    subtitle: "Valsa Acústica & Baixo Pizzicato Leve",
    url: "./audio/relax-pizzicato.mp3",
    icon: "🎨"
  },
  {
    id: 2,
    title: "Manhã de Domingo",
    subtitle: "Ukulele, Marimba & Melodia Relaxante",
    url: "./audio/relax-ukulele.mp3",
    icon: "☀️"
  },
  {
    id: 3,
    title: "Café & Pensamentos",
    subtitle: "Violão Acústico & Ritmo Calmo",
    url: "./audio/relax-acoustic.mp3",
    icon: "☕"
  }
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private musicVolume: number = 0.4;
  private sfxVolume: number = 0.6;
  private currentTrackIndex: number = 0;
  private audioElement: HTMLAudioElement | null = null;
  private hasInteracted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedSfx = localStorage.getItem("ftf_sfx_enabled");
      const savedMusic = localStorage.getItem("ftf_music_enabled");
      const savedVol = localStorage.getItem("ftf_music_volume");
      const savedTrack = localStorage.getItem("ftf_music_track");

      this.sfxEnabled = savedSfx !== null ? savedSfx === "true" : true;
      this.musicEnabled = savedMusic !== null ? savedMusic === "true" : true;
      this.musicVolume = savedVol !== null ? parseFloat(savedVol) : 0.4;
      this.currentTrackIndex = savedTrack !== null ? parseInt(savedTrack, 10) : 0;

      // Autostart on first document click/touch
      const handleFirstInteraction = () => {
        if (this.hasInteracted) return;
        this.hasInteracted = true;
        this.initAudioElement();
        if (this.musicEnabled) {
          this.playMusic();
        }
        window.removeEventListener("click", handleFirstInteraction);
        window.removeEventListener("touchstart", handleFirstInteraction);
      };

      window.addEventListener("click", handleFirstInteraction);
      window.addEventListener("touchstart", handleFirstInteraction);
    }
  }

  private initAudioElement() {
    if (!this.audioElement && typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.volume = this.musicVolume;
      const track = RELAX_TRACKS[this.currentTrackIndex] || RELAX_TRACKS[0];
      this.audioElement.src = track.url;
    }
  }

  // --- MUSIC CONTROLS ---
  public getTracks(): RelaxTrack[] {
    return RELAX_TRACKS;
  }

  public getCurrentTrack(): RelaxTrack {
    return RELAX_TRACKS[this.currentTrackIndex] || RELAX_TRACKS[0];
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem("ftf_music_enabled", String(enabled));
    }
    if (enabled) {
      this.playMusic();
    } else {
      this.pauseMusic();
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.musicVolume;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem("ftf_music_volume", String(this.musicVolume));
    }
  }

  public playMusic() {
    this.initAudioElement();
    if (!this.audioElement || !this.musicEnabled) return;
    this.audioElement.play().catch(() => {});
  }

  public pauseMusic() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public setTrack(trackId: number) {
    const idx = RELAX_TRACKS.findIndex(t => t.id === trackId);
    if (idx === -1) return;
    this.currentTrackIndex = idx;
    if (typeof window !== 'undefined') {
      localStorage.setItem("ftf_music_track", String(idx));
    }
    this.initAudioElement();
    if (this.audioElement) {
      const wasPlaying = !this.audioElement.paused;
      this.audioElement.src = RELAX_TRACKS[idx].url;
      this.audioElement.currentTime = 0;
      if (this.musicEnabled) {
        this.audioElement.play().catch(() => {});
      }
    }
  }

  public nextTrack() {
    const nextIdx = (this.currentTrackIndex + 1) % RELAX_TRACKS.length;
    this.setTrack(RELAX_TRACKS[nextIdx].id);
  }

  public prevTrack() {
    const prevIdx = (this.currentTrackIndex - 1 + RELAX_TRACKS.length) % RELAX_TRACKS.length;
    this.setTrack(RELAX_TRACKS[prevIdx].id);
  }

  // --- SFX CONTROLS ---
  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem("ftf_sfx_enabled", String(enabled));
    }
  }

  // Backward compatibility methods
  public isEnabled(): boolean {
    return this.sfxEnabled;
  }
  public setEnabled(val: boolean) {
    this.setSfxEnabled(val);
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playClick() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15 * this.sfxVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  public playCardFlip() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2 * this.sfxVolume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {}
  }

  public playQuestion() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(520, now + 0.08);
      osc.frequency.setValueAtTime(660, now + 0.16);

      gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  public playAnswerYes() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);

      gain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.36);
    } catch (e) {}
  }

  public playAnswerNo() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.12);

      gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.26);
    } catch (e) {}
  }

  public playWin() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.2 * this.sfxVolume, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.36);
      });
    } catch (e) {}
  }
}

export const sounds = new SoundEngine();
