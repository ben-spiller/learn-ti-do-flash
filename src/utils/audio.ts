// Solfege note frequencies in Hz (C4 scale)
const SOLFEGE_FREQUENCIES: Record<string, number> = {
  Do: 261.63,  // C4
  Re: 293.66,  // D4
  Mi: 329.63,  // E4
  Fa: 349.23,  // F4
  Sol: 392.00, // G4
  La: 440.00,  // A4
  Ti: 493.88,  // B4
};

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playNote = (note: string, duration: number = 0.5) => {
  const frequency = SOLFEGE_FREQUENCIES[note];
  if (!frequency) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";

  // Envelope for smoother sound
  const now = ctx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration);
};

export const playSequence = async (notes: string[], gap: number = 0.7) => {
  for (let i = 0; i < notes.length; i++) {
    playNote(notes[i]);
    await new Promise((resolve) => setTimeout(resolve, gap * 1000));
  }
};

export const generateRandomSequence = (
  availableNotes: string[],
  length: number
): string[] => {
  const sequence: string[] = [];
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * availableNotes.length);
    sequence.push(availableNotes[randomIndex]);
  }
  return sequence;
};
