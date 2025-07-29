// src/utils/audio.ts

// Create a single AudioContext instance
let audioContext: AudioContext | null = null;

// Function to get or create the AudioContext
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Function to play a simple tone
export const playTone = (frequency: number = 440, duration: number = 0.2, volume: number = 0.1) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = 'sine';

    // Set the volume
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
};

// Predefined sound functions
export const playStartSound = () => playTone(880, 0.3, 0.15); // Higher pitch for start
export const playFinishSound = () => playTone(440, 1, 0.25); // Lower, longer tone for finish
export const playResetSound = () => playTone(660, 0.15, 0.1); // Middle pitch for reset
export const playClickSound = () => playTone(1000, 0.05, 0.05); // Very short, high-pitched click

// Alias for toast sounds
export const playSuccessSound = playStartSound;
export const playErrorSound = playResetSound;

// Function to close the audio context (optional, for cleanup)
export const closeAudioContext = () => {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};