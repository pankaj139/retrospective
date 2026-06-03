// Web Audio API Sound Synthesizer
// Lazily created AudioContext to comply with browser autoplay security policies

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Play a satisfying popping sound (ideal for shooting balloons).
 */
export const playPop = (pitch: number = 400) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Short pop: starts high pitch, ramps down fast, decays quickly
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch, now);
  osc.frequency.exponentialRampToValueAtTime(pitch * 2.5, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc.start(now);
  osc.stop(now + 0.12);
};

/**
 * Play a futuristic laser click (ideal for UI clicks).
 */
export const playClick = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

  osc.start(now);
  osc.stop(now + 0.06);
};

/**
 * Play a cheerful bell sound (ideal for scoring or upvotes).
 */
export const playScore = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Note 1
  playTone(523.25, 0.15, 'triangle', now); // C5
  // Note 2 slightly offset
  playTone(659.25, 0.15, 'triangle', now + 0.07); // E5
  // Note 3
  playTone(783.99, 0.25, 'triangle', now + 0.14); // G5
};

/**
 * Play a short success fanfare (ideal for phase completion).
 */
export const playSuccess = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // C5, E5, G5, C6 in rapid succession
  playTone(523.25, 0.1, 'sine', now);
  playTone(659.25, 0.1, 'sine', now + 0.08);
  playTone(783.99, 0.1, 'sine', now + 0.16);
  playTone(1046.50, 0.4, 'sine', now + 0.24);
};

/**
 * Play a subtle clock tick (ideal for DAKI timers).
 */
export const playClock = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, now);

  gain.gain.setValueAtTime(0.03, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.start(now);
  osc.stop(now + 0.03);
};

/**
 * Play a buzzer sound (ideal for timer complete).
 */
export const playBuzzer = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Two low-frequency sawtooth waves slightly detuned for a buzzy sound
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(180, now);
  
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(184, now); // slightly detuned

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
};

// Helper function to play a simple synth tone
function playTone(freq: number, duration: number, type: OscillatorType, time: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.start(time);
  osc.stop(time + duration);
}
