// Map solfege to standard note names (C4 scale)
const SOLFEGE_TO_NOTE: Record<string, string> = {
  Do: 'C4',
  Re: 'D4',
  Mi: 'E4',
  Fa: 'F4',
  Sol: 'G4',
  La: 'A4',
  Ti: 'B4',
};

let audioContext: AudioContext | null = null;
let pianoPlayer: any = null; // from Soundfont.js
let soundfontLoaded = false;
let currentInstrument = 'acoustic_grand_piano';

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Load Soundfont.js script from CDN and initialize the piano instrument.
const loadSoundfontScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Soundfont) {
      soundfontLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/soundfont-player@0.15.1/dist/soundfont-player.js';
    script.async = true;
    script.onload = () => {
      soundfontLoaded = true;
      resolve();
    };
    script.onerror = (e) => reject(new Error('Failed to load Soundfont script'));
    document.head.appendChild(script);
  });
};

/**
 * Load the configured instrument. If `instrument` is provided and differs from the current
 * instrument, it will replace the current instrument and reload the samples.
 */
const loadPiano = async (instrument?: string) => {
  if (instrument && instrument !== currentInstrument) {
    currentInstrument = instrument;
    pianoPlayer = null;
  }

  if (pianoPlayer) return pianoPlayer;

  const ctx = getAudioContext();

  try {
    if (!soundfontLoaded) {
      await loadSoundfontScript();
    }

    const Soundfont = (window as any).Soundfont;
    pianoPlayer = await Soundfont.instrument(ctx, currentInstrument);
    return pianoPlayer;
  } catch (err) {
    pianoPlayer = null;
    throw err;
  }
};

// Ensure AudioContext is resumed on first user interaction if needed
const ensureContextRunning = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      // ignore - resume may require user gesture
    }
  }
};

/**
 * Set the instrument (General MIDI name understood by Soundfont.js) and preload it.
 */
export const setInstrument = async (instrumentName: string) => {
  currentInstrument = instrumentName;
  pianoPlayer = null;
  try {
    await loadPiano();
  } catch (err) {
    console.error('Failed to load instrument', instrumentName, err);
    // Notify the user; keep message concise so repeated calls don't spam.
    try {
      window.alert('Failed to load instrument samples. Check your network or try a different instrument.');
    } catch (_) {}
    throw err;
  }
};

/**
 * Prompt the user (this click satisfies browser gesture requirements) and preload the configured instrument.
 * Call this from the exercise start flow (e.g. on a "Start exercise" button click).
 */
export const preloadInstrumentWithGesture = async (instrumentName?: string) => {

  try {
    await ensureContextRunning();
    if (instrumentName) currentInstrument = instrumentName;
    await loadPiano();
  } catch (err) {
    console.error('Preload failed', err);
    try {
      window.alert('Unable to load instrument samples. Audio will not be available.');
    } catch (_) {}
  }
};

export const getCurrentInstrument = () => currentInstrument;

export const playNote = async (note: string, duration: number = 0.5) => {
  const noteName = SOLFEGE_TO_NOTE[note] || note; // allow passing note names directly

  await ensureContextRunning();

  try {
    const player = await loadPiano();
    if (player && typeof player.play === 'function') {
      player.play(noteName, undefined, { duration });
      return;
    }

    console.error('Soundfont player is not available to play note', noteName);
    try {
      window.alert('Audio not available: unable to play note.');
    } catch (_) {}
  } catch (err) {
    console.error('Error playing note', err);
    try {
      window.alert('Error while trying to play sound. See console for details.');
    } catch (_) {}
  }
};

export const playSequence = async (notes: string[], gap: number = 0.7) => {
  for (let i = 0; i < notes.length; i++) {
    await playNote(notes[i]);
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
