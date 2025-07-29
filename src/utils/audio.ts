// src/utils/audio.ts

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

interface PlaySoundOptions {
  frequency?: number;
  type?: OscillatorType;
  duration?: number; // in seconds
  volume?: number;
  attack?: number; // in seconds
  decay?: number; // in seconds
}

export const playSimpleSound = (options?: PlaySoundOptions) => {
  const {
    frequency = 440, // A4 note
    type = 'sine',
    duration = 0.1, // seconds
    volume = 0.3,
    attack = 0.01, // quick attack
    decay = 0.05, // quick decay
  } = options || {};

  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Envelope for click/chime effect
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + attack + decay);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
};

export const playSuccessSound = () => {
  playSimpleSound({ frequency: 880, duration: 0.15, volume: 0.4, type: 'sine', attack: 0.02, decay: 0.1 }); // Higher pitch, short chime
};

export const playErrorSound = () => {
  playSimpleSound({ frequency: 150, duration: 0.2, volume: 0.5, type: 'triangle', attack: 0.01, decay: 0.15 }); // Lower pitch, more 'thud' like
};

export const playClickSound = () => {
  playSimpleSound({ frequency: 1000, duration: 0.05, volume: 0.1, type: 'square', attack: 0.005, decay: 0.02 }); // Very short, subtle click
};

// Function to close the audio context when no longer needed (e.g., on app unmount)
export const closeAudioContext = () => {
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
};