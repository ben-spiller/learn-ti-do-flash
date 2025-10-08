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
let toneInstrument: any = null; // Tone.js synth / sampler instance
let toneLoaded = false;
let currentInstrument = 'acoustic_grand_piano';
// Default sample base: point at the midi-js soundfonts on jsDelivr (FluidR3_GM)
// We will load instrument JS files like `${instrument}-mp3.js` from this base.
let SAMPLE_BASE = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/';

// Cache for midi-js soundfont script loading and decoded AudioBuffers
const _midiJsLoaded: Record<string, boolean> = {};
const _midiJsData: Record<string, any> = {};
const _decodedBuffers: Record<string, Record<string, AudioBuffer>> = {};

// Preload dedupe: track in-flight preload promises, completed keys, and progress callbacks
const _preloadPromises: Record<string, Promise<boolean>> = {};
const _preloadCallbacks: Record<string, Array<(decoded: number, total: number) => void>> = {};
const _preloadedDone: Record<string, boolean> = {};

const loadMidiJsSoundfontScript = (instrument: string): Promise<void> => {
  const key = instrument;
  if (_midiJsLoaded[key]) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // script URL pattern: `${SAMPLE_BASE}${instrument}-mp3.js`
    const url = SAMPLE_BASE + `${instrument}-mp3.js`;
    // If the soundfont object already exists, reuse it
    const globalObj = (window as any).MIDI && (window as any).MIDI.Soundfont && (window as any).MIDI.Soundfont[instrument];
    if (globalObj) {
      _midiJsData[key] = globalObj;
      _midiJsLoaded[key] = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => {
      try {
        const obj = (window as any).MIDI && (window as any).MIDI.Soundfont && (window as any).MIDI.Soundfont[instrument];
        if (!obj) {
          reject(new Error('Loaded soundfont script but MIDI.Soundfont["' + instrument + '"] not found'));
          return;
        }
        _midiJsData[key] = obj;
        _midiJsLoaded[key] = true;
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Failed to load midi-js soundfont script: ' + url));
    document.head.appendChild(script);
  });
};

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const decodeSoundfontSample = async (instrument: string, noteKey: string, dataUri: string, audioCtx: BaseAudioContext) => {
  _decodedBuffers[instrument] = _decodedBuffers[instrument] || {};
  if (_decodedBuffers[instrument][noteKey]) return _decodedBuffers[instrument][noteKey];

  // dataUri e.g. 'data:audio/mp3;base64,AAA...'
  const base64 = dataUri.split(',')[1];
  const arrayBuffer = base64ToArrayBuffer(base64);
  return await new Promise<AudioBuffer>((resolve, reject) => {
    audioCtx.decodeAudioData(arrayBuffer, (buf) => {
      _decodedBuffers[instrument][noteKey] = buf;
      resolve(buf);
    }, (err) => reject(err));
  });
};

const findClosestSampleKey = (soundfontObj: Record<string, string>, targetMidi: number) => {
  // soundfontObj keys are note names like 'A0', 'C#4'
  const keys = Object.keys(soundfontObj);
  let best: string | null = null;
  let bestDiff = Infinity;
  for (const k of keys) {
    const midi = noteNameToMidi(k);
    if (midi == null) continue;
    const diff = Math.abs(midi - targetMidi);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return best;
};

/**
 * Create a lightweight midi-js player that decodes samples using Tone's AudioContext
 * and exposes triggerAttackRelease(noteName, duration).
 */
const createMidiJsPlayerUsingTone = async (instrument: string) => {
  // instrument is like 'acoustic_grand_piano'
  await loadMidiJsSoundfontScript(instrument);
  const sf = _midiJsData[instrument];
  if (!sf) throw new Error('Soundfont data not found for ' + instrument);

  // Use Tone's raw audio context when available so everything shares the same context
  const Tone = (window as any).Tone;
  const toneRawCtx: BaseAudioContext | null = Tone && (Tone.getContext ? Tone.getContext().rawContext : Tone.context && Tone.context.rawContext) || null;
  const audioCtx = (toneRawCtx as any) || getAudioContext();

  const player = {
    async triggerAttackRelease(noteName: string, duration: number) {
      // soundfont keys are note names like 'C4'
      const midi = noteNameToMidi(noteName);
      if (midi == null) throw new Error('Invalid note name: ' + noteName);

      // find exact sample or the closest available
      let sampleKey = noteName;
      if (!sf[sampleKey]) {
        const closest = findClosestSampleKey(sf, midi);
        if (!closest) throw new Error('No sample available for instrument ' + instrument);
        sampleKey = closest;
      }

      const dataUri = sf[sampleKey];
      if (!dataUri) throw new Error('Sample data missing for ' + sampleKey);

      const buffer = await decodeSoundfontSample(instrument, sampleKey, dataUri, audioCtx);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      // connect to Tone's destination if possible
      if (toneRawCtx) {
        source.connect(toneRawCtx.destination);
      } else {
        source.connect(audioCtx.destination);
      }
      const when = audioCtx.currentTime + 0.0;
      source.start(when);
      source.stop(when + duration);
    }
  };

  return player;
};

// Instrument catalog maps instrument slug -> { label, urls } where urls is a mapping of note->filename
// Example entry for an instrument:
// acoustic_grand_piano: { label: 'Acoustic Grand Piano', urls: { 'C3': 'C3.mp3', 'E3': 'E3.mp3', ... } }
const INSTRUMENT_CATALOG: Record<string, { label?: string; urls: Record<string, string> }> = {};

export const setSampleBase = (baseUrl: string) => {
  SAMPLE_BASE = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
};

export const registerInstrument = (slug: string, data: { label?: string; urls: Record<string, string> }) => {
  INSTRUMENT_CATALOG[slug] = data;
};

// WebAudioFont support removed: unused in current flow. Kept midi-js (jsDelivr) and Tone paths.

const noteNameToMidi = (note: string) => {
  const match = note.match(/^([A-G])(#{0,1}|b{0,1})(\d+)$/);
  if (!match) return null;
  const [, pitch, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitoneFromC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semis = semitoneFromC[pitch];
  if (accidental === '#') semis += 1;
  if (accidental === 'b') semis -= 1;
  const midiNumber = 12 + semis + (octave * 12);
  return midiNumber; // standard MIDI note number (C4 == 60)
};


const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Load Tone.js from CDN and initialize a synth/sampler-based instrument.
const loadToneScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Tone) {
      toneLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    // Using a specific build that exposes window.Tone
    script.src = 'https://unpkg.com/tone@14.8.39/build/Tone.js';
    script.async = true;
    script.onload = () => {
      toneLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Tone.js from CDN'));
    document.head.appendChild(script);
  });
};

/**
 * Create a Tone.js instrument for the given instrument name.
 * We use lightweight synths (PolySynth/Synth/FMSynth/AMSynth) mapped to instrument names.
 * This avoids bundling large sample packs while giving access to many timbres.
 */
const createToneInstrument = async (instrument?: string) => {
  if (instrument && instrument !== currentInstrument) {
    currentInstrument = instrument;
    if (toneInstrument && typeof toneInstrument.dispose === 'function') {
      try { toneInstrument.dispose(); } catch (_) {}
      toneInstrument = null;
    }
  }

  if (toneInstrument) return toneInstrument;

  if (!toneLoaded) {
    await loadToneScript();
  }

  const Tone = (window as any).Tone;
  if (!Tone) throw new Error('Tone.js is not available after loading');

  // Map some friendly instrument names to Tone synth constructs.
  const name = currentInstrument.toLowerCase();

  try {
    if (name.includes('piano')) {
      // Create a sampled piano using Tone.Sampler. We provide a small set of samples
      // and let Tone's sampler pitch-shift them to other notes. This gives a
      // much more realistic piano timbre than a basic synth while remaining
      // lightweight (only a few sample files).
      // Prefer instrument catalog if available (per-note files hosted under SAMPLE_BASE)
      const catalogEntry = INSTRUMENT_CATALOG[currentInstrument];
      if (catalogEntry && catalogEntry.urls && Object.keys(catalogEntry.urls).length > 0) {
        toneInstrument = new Tone.Sampler({
          urls: catalogEntry.urls,
          baseUrl: SAMPLE_BASE,
        }).toDestination();
        // Wait for samples to finish loading
        await Tone.loaded();
      } else {
        // No per-note catalog: use midi-js soundfonts hosted on jsDelivr (FluidR3_GM)
        // createMidiJsPlayerUsingTone will load the instrument JS, decode embedded
        // base64 sample blobs using Tone's AudioContext, and return a small player
        // with triggerAttackRelease(note, duration).
        toneInstrument = await createMidiJsPlayerUsingTone(currentInstrument);
      }
    } else if (name.includes('fm') || name.includes('electric')) {
      toneInstrument = new Tone.PolySynth(Tone.FMSynth, { volume: -4 }).toDestination();
    } else if (name.includes('am') || name.includes('voice')) {
      toneInstrument = new Tone.PolySynth(Tone.AMSynth, { volume: -4 }).toDestination();
    } else if (name.includes('saw') || name.includes('lead')) {
      toneInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, volume: -2 }).toDestination();
    } else if (name.includes('organ')) {
      toneInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, volume: -6 }).toDestination();
    } else {
      // default: versatile poly synth
      toneInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, volume: -8 }).toDestination();
    }
    return toneInstrument;
  } catch (err) {
    toneInstrument = null;
    throw err;
  }
};

// Ensure AudioContext is resumed on first user interaction if needed
const ensureContextRunning = async () => {
  // For Tone.js we need to call Tone.start() within a user gesture. Also resume AudioContext if present.
  try {
    if ((window as any).Tone && typeof (window as any).Tone.start === 'function') {
      await (window as any).Tone.start();
    }
  } catch (_) {
    // ignore
  }
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
  toneInstrument = null;
  try {
    await createToneInstrument();
  } catch (err) {
    console.error('Failed to create instrument', instrumentName, err);
    try { window.alert('Failed to initialize instrument. Check the console for details.'); } catch (_) {}
    throw err;
  }
};

/**
 * Prompt the user (this click satisfies browser gesture requirements) and preload the configured instrument.
 * Call this from the exercise start flow (e.g. on a "Start exercise" button click).
 */
type NoteRange = { from: string; to: string };

const midiToNoteName = (midi: number) => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
};

const getNotesBetween = (from: string, to: string) => {
  const start = noteNameToMidi(from);
  const end = noteNameToMidi(to);
  if (start == null || end == null) return [];
  const notes: string[] = [];
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  for (let m = a; m <= b; m++) {
    notes.push(midiToNoteName(m));
  }
  return notes;
};

/**
 * Prompt the user (this click satisfies browser gesture requirements) and preload the configured instrument.
 * Optionally pre-decode a list of notes or a from/to range. If omitted, defaults to C3..C5.
 */
export const preloadInstrumentWithGesture = async (
  instrumentName?: string,
  predecodeNotes?: string[] | NoteRange,
  progressCallback?: (decoded: number, total: number) => void
): Promise<boolean> => {
  // Determine the effective instrument and normalized note-range key so we
  // dedupe preloads for identical requests.
  const instrumentToUse = instrumentName || currentInstrument;
  const normalizeRangeKey = (p?: string[] | NoteRange) => {
    if (!p) return 'C3-C5';
    if (Array.isArray(p)) return `arr:${p.join(',')}`;
    return `range:${(p as NoteRange).from}->${(p as NoteRange).to}`;
  };
  const rangeKey = normalizeRangeKey(predecodeNotes);
  const key = `${instrumentToUse}|${rangeKey}`;

  // If already fully preloaded, immediately notify and resolve
  if (_preloadedDone[key]) {
    progressCallback?.(1, 1);
    return Promise.resolve(true);
  }

  // If there's an in-flight preload for the same key, subscribe progress and
  // return the existing promise.
  if (_preloadPromises[key]) {
    if (progressCallback) {
      _preloadCallbacks[key] = _preloadCallbacks[key] || [];
      _preloadCallbacks[key].push(progressCallback);
    }
    return _preloadPromises[key];
  }

  // Register callback list for this preload
  _preloadCallbacks[key] = progressCallback ? [progressCallback] : [];

  const promise = (async () => {
    console.log('Preloading instrument', instrumentName || currentInstrument);
    try {
      await ensureContextRunning();
      if (instrumentName) currentInstrument = instrumentName;
      await createToneInstrument();

      // Determine whether we should pre-decode samples (only applicable for midi-js path)
      const catalogEntry = INSTRUMENT_CATALOG[currentInstrument];
      const shouldUseMidiJs = !(catalogEntry && catalogEntry.urls && Object.keys(catalogEntry.urls).length > 0);

      // Build notes list to pre-decode
      let notesToDecode: string[] = [];
      if (Array.isArray(predecodeNotes)) {
        notesToDecode = predecodeNotes;
      } else if (predecodeNotes && (predecodeNotes as NoteRange).from) {
        const r = predecodeNotes as NoteRange;
        notesToDecode = getNotesBetween(r.from, r.to);
      } else {
        // default range: C3..C5
        notesToDecode = getNotesBetween('C3', 'C5');
      }

      if (shouldUseMidiJs) {
        // Ensure the soundfont JS is loaded and then decode each target (or closest) sample
        try {
          await loadMidiJsSoundfontScript(currentInstrument);
          const sf = _midiJsData[currentInstrument];
          const Tone = (window as any).Tone;
          const toneRawCtx: BaseAudioContext | null = Tone && (Tone.getContext ? Tone.getContext().rawContext : Tone.context && Tone.context.rawContext) || null;
          const audioCtx = (toneRawCtx as any) || getAudioContext();
          const total = notesToDecode.length;
          for (let i = 0; i < notesToDecode.length; i++) {
            const noteName = notesToDecode[i];
            const midi = noteNameToMidi(noteName);
            if (midi == null) {
              (_preloadCallbacks[key] || []).forEach(cb => cb(i + 1, total));
              continue;
            }
            let sampleKey = noteName;
            if (!sf[sampleKey]) {
              const closest = findClosestSampleKey(sf, midi);
              if (!closest) {
                (_preloadCallbacks[key] || []).forEach(cb => cb(i + 1, total));
                continue;
              }
              sampleKey = closest;
            }
            const dataUri = sf[sampleKey];
            if (!dataUri) {
              (_preloadCallbacks[key] || []).forEach(cb => cb(i + 1, total));
              continue;
            }
            // decode and cache
            try {
              // decodeSoundfontSample will cache decoded buffers
              // eslint-disable-next-line no-unused-vars
              const buf = await decodeSoundfontSample(currentInstrument, sampleKey, dataUri, audioCtx);
            } catch (err) {
              // continue on decode error
              console.warn('Failed to decode sample', currentInstrument, sampleKey, err);
            }
            (_preloadCallbacks[key] || []).forEach(cb => cb(i + 1, total));
          }
        } catch (err) {
          console.warn('Pre-decode (midi-js) failed', err);
        }
      }
      // Signal completion if using catalog or midi-js path finished
      (_preloadCallbacks[key] || []).forEach(cb => cb(1, 1));
      _preloadedDone[key] = true;
      return true;
    } catch (err) {
      console.error('Preload failed', err);
      try {
        window.alert('Unable to initialize audio. Audio will not be available.');
      } catch (_) {}
      return false;
    } finally {
      // cleanup in-flight promise and callbacks (keep _preloadedDone if succeeded)
      delete _preloadPromises[key];
      delete _preloadCallbacks[key];
    }
  })();

  _preloadPromises[key] = promise;
  return promise;
};

export const getCurrentInstrument = () => currentInstrument;

export const playNote = async (note: string, duration: number = 1.0) => {
  const noteName = SOLFEGE_TO_NOTE[note] || note; // allow passing note names directly

  await ensureContextRunning();
  try {
    const player = await createToneInstrument();
    if (player && typeof player.triggerAttackRelease === 'function') {
      // Tone.js expects note names like 'C4'
      player.triggerAttackRelease(noteName, duration);
      return;
    }

    // PolySynth may expose 'triggerAttackRelease' on its voice or directly; try Tone's Transport-scheduled play as fallback
    if (player && typeof player.triggerAttack === 'function') {
      player.triggerAttackRelease(noteName, duration);
      return;
    }

    console.error('Tone instrument is not available to play note', noteName);
    try { window.alert('Audio not available: unable to play note.'); } catch (_) {}
  } catch (err) {
    console.error('Error playing note', err);
    try { window.alert('Error while trying to play sound. See console for details.'); } catch (_) {}
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
