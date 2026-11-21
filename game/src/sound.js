// Sound, synthesized with WebAudio and nothing else: guard footsteps that tell you
// where a guard is, a rising tone while you are seen, a chime for each exhibit, an
// alarm when you are caught. No audio files, no network. The context is created on
// the first user gesture; before that every call is a no-op, so screenshot scenes
// stay silent.

export function createSound() {
  let context = null;
  let master = null;
  let lastStepAt = 0;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from a user gesture so the browser lets sound start. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function blip(frequency, seconds, type, gainValue, when = 0) {
    if (!ensure() || context.state !== 'running') return;
    const t = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainValue, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  }

  function thud(gainValue) {
    if (!ensure() || context.state !== 'running') return;
    const t = context.currentTime;
    const length = Math.floor(context.sampleRate * 0.07);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) * 0.6;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = context.createGain();
    gain.gain.value = gainValue;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t);
  }

  return {
    unlock,
    /** One guard footstep: louder the closer the guard (distance 0..1). */
    footstep(closeness) {
      const now = performance.now();
      if (now - lastStepAt < 140) return;
      lastStepAt = now;
      thud(0.12 + 0.5 * closeness);
    },
    /** A short rising tone while the player is seen; pitch follows the meter. */
    spotted(meter) {
      blip(220 + 420 * meter, 0.12, 'sine', 0.08);
    },
    pickup() {
      blip(660, 0.12, 'triangle', 0.16);
      blip(990, 0.18, 'triangle', 0.14, 0.08);
    },
    pebble() {
      blip(1400, 0.05, 'square', 0.06);
    },
    caught() {
      blip(196, 0.3, 'sawtooth', 0.2);
      blip(147, 0.4, 'sawtooth', 0.2, 0.22);
    },
    win() {
      blip(523, 0.14, 'triangle', 0.16);
      blip(659, 0.14, 'triangle', 0.16, 0.12);
      blip(784, 0.26, 'triangle', 0.18, 0.24);
    },
  };
}
