/** Specifies the number of semitones above (or for negative numbers, below)
 * the root ("do") note. Add this to rootMidi to get the absolute MIDI note number.
 * This can extend beyond the octave (0-11) range. Use %12 to get the pitch class.  
 */
export type SemitoneOffset = number;

/** Specifies an absolute MIDI note number (0-127). 
 */
export type MidiNoteNumber = number;

/** A string like "C4", "G#3", "Bb2" representing a specific note 
 */
export type MidiNoteName = string;


// Major scale intervals (semitones) from the root - do, re, me, etc
export const MAJOR_SCALE_PITCH_CLASSES: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11];

export const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const SOLFEGE_NAMES = ['Do (1)', 'Ra (b2)', 'Re (2)', 'Me (b3)', 'Mi (3)', 'Fa (4)', 'Se (b5)', 'Sol (5)', 'Le (b6)', 'La (6)', 'Te (b7)', 'Ti (7)'] as const;
const CHORD_NAMES = ['Do (I)', 'Ra (bII)', 'Re (ii)', 'Me (bIII)', 'Mi (iii)', 'Fa (IV)', 'Se (bV)', 'Sol (V)', 'Le (bVI)', 'La (vi)', 'Te (bVII)', 'Ti (vii°)'] as const;
// not sure about bII and bV

const INTERVAL_NAMES = ['octave','min2', 'Maj2', 'min3', 'Maj3', '4', 'aug4', '5', 'min6', 'min6', 'min7', 'Maj7'] as const;

/** Normalize any semitone offset to a value from 0..11 */
export function semitonesToOneOctave(semitoneOffset: SemitoneOffset): SemitoneOffset {
  while (semitoneOffset < 0) {
    semitoneOffset += 12;
  }
  return semitoneOffset % 12;
}

export function semitonesToSolfege(semitoneOffset: SemitoneOffset, longVersion = false, chordVersion = false): string {
  const pc = semitonesToOneOctave(semitoneOffset); // normalize to 0..11
  const name = (chordVersion ? CHORD_NAMES : SOLFEGE_NAMES)[pc];
  if (longVersion) return name;
  return name.split(' ')[0];
}

/** Return the display name of the musical interval (e.g. 2nd, 5th etc) for a (positive) semi-tone offset */
export function semitonesToInterval(semitoneOffset: SemitoneOffset): string {
  const pc = semitonesToOneOctave(semitoneOffset); // normalize to 0..11
  return INTERVAL_NAMES[pc];
}

//returns MidiNoteNumber
export const noteNameToMidi = (note: MidiNoteName) => {
  if (!note || typeof note !== 'string') throw new Error('Invalid note name: ' + note);
  const match = note.match(/^([A-G])(#{0,1}|b{0,1})(\d+)$/);
  if (!match) throw new Error('Invalid note name: ' + note);
  const [, pitch, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitoneFromC: Record<string, SemitoneOffset> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semis = semitoneFromC[pitch];
  if (accidental === '#') semis += 1;
  if (accidental === 'b') semis -= 1;
  const midiNumber = 12 + semis + (octave * 12);
  return midiNumber; // standard MIDI note number (C4 == 60)
};

export const midiToNoteName = (midi: MidiNoteNumber) => {
  const names = NOTE_NAMES;
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
};


/** Gets the note indicated by the specified window keydown event */
export function keypressToSemitones(e: KeyboardEvent): SemitoneOffset | null {
    // Map keys to solfege intervals (semitones from root)
    const keyToInterval: Record<string, number> = {
      '1': 0, 'd': 0,  // do
      '2': 2, 'r': 2,  // re
      '3': 4, 'm': 4,  // mi
      '4': 5, 'f': 5,  // fa
      '5': 7, 's': 7,  // sol
      '6': 9, 'l': 9,  // la
      '7': 11, 't': 11, // ti
    };

    // Map shifted number keys to sharp intervals
    const shiftedKeyToInterval: Record<string, number> = {
      '!': 1,  // SHIFT+1 → do#
      '@': 3,  // SHIFT+2 → re#
      '#': 5,  // SHIFT+3 → mi#
      '$': 6,  // SHIFT+4 → fa#
      '%': 8,  // SHIFT+5 → sol#
      '^': 10, // SHIFT+6 → la#
      '&': 12, // SHIFT+7 → ti#
      '"': 3,  // UK layout SHIFT+2
      '£': 5,  // UK layout SHIFT+3
      '€': 6,  // Some layouts SHIFT+4
    };

    const key = e.key.toLowerCase();
    
    // Check for shifted number keys first
    if (e.key in shiftedKeyToInterval) {
      console.log('Shifted key detected:', { key: e.key, code: e.code, shiftKey: e.shiftKey });
      return shiftedKeyToInterval[e.key];
    }
    // Then check regular keys
    else if (key in keyToInterval) {
      let interval = keyToInterval[key];
      // If SHIFT is held with letter keys, play the sharp (semitone higher)
      if (e.shiftKey && /[drmfslt]/.test(key)) {
        interval += 1;
      }
      return interval;
    }
    return null;
}

let audioContext: AudioContext | null = null;
let toneInstrument: any = null; // Tone.js synth / sampler instance
let toneLoaded = false;
let currentInstrument = 'acoustic_grand_piano';
let droneSynth: any = null; // PolySynth for background drone
let masterVolume: number = -8; // Master volume in dB
let masterGainNode: GainNode | null = null; // Master gain node for midi-js player
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
        console.warn('Error processing loaded midi-js soundfont script', e);
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

  // Create master gain node for volume control if it doesn't exist
  if (!masterGainNode) {
    masterGainNode = audioCtx.createGain();
    // Convert dB to gain: gain = 10^(dB/20)
    masterGainNode.gain.value = Math.pow(10, masterVolume / 20);
    if (toneRawCtx) {
      masterGainNode.connect(toneRawCtx.destination);
    } else {
      masterGainNode.connect(audioCtx.destination);
    }
  }

  const player = {
    async triggerAttackRelease(noteName: string, duration: number, when?: number) {
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

      // schedule start time
      const startAt = typeof when === 'number' ? when : audioCtx.currentTime + 0.0;

      // Create a per-note gain node so we can apply a release envelope instead of
      // abruptly stopping the source (which causes clicks / unnatural truncation).
      const gainNode = audioCtx.createGain();
      // Ensure gain starts at full volume at the scheduled start time
      gainNode.gain.setValueAtTime(1, startAt);

      // Connect source -> gain -> master gain -> destination
      source.connect(gainNode);
      if (masterGainNode) {
        gainNode.connect(masterGainNode);
      } else if (toneRawCtx) {
        gainNode.connect(toneRawCtx.destination);
      } else {
        gainNode.connect(audioCtx.destination);
      }

      // Choose a sensible release time per instrument family. These are defaults
      // and can be tuned per-instrument later (or read from INSTRUMENT_CATALOG).
      const lower = (instrument || '').toLowerCase();
      let release = 0.35; // default
      if (lower.includes('piano')) release = 0.18;
      else if (lower.includes('organ')) release = 1.2;
      else if (lower.includes('violin') || lower.includes('string')) release = 0.9;

      // Use an exponential-like decay via setTargetAtTime for a natural tail.
      // timeConstant controls the curve; smaller => faster drop.
      const timeConstant = Math.max(0.02, release * 0.25);
      // Schedule the release to start at (startAt + duration)
      gainNode.gain.setTargetAtTime(0.0001, startAt + duration, timeConstant);

      // Stop the source slightly after the release finishes to free resources.
      const stopTime = startAt + duration + Math.max(0.05, release * 1.1);
      source.start(startAt);
      source.stop(stopTime);

      // Cleanup gain node when source ends
      source.onended = () => {
        try { gainNode.disconnect(); } catch (_) {}
      };
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
    // Try to load midi-js soundfont for ALL instruments first
    // Prefer instrument catalog if available (per-note files hosted under SAMPLE_BASE)
    const catalogEntry = INSTRUMENT_CATALOG[currentInstrument];
    if (catalogEntry && catalogEntry.urls && Object.keys(catalogEntry.urls).length > 0) {
      toneInstrument = new Tone.Sampler({
        urls: catalogEntry.urls,
        baseUrl: SAMPLE_BASE,
        volume: masterVolume,
      }).toDestination();
      // Wait for samples to finish loading
      await Tone.loaded();
    } else {
      // Use midi-js soundfonts hosted on jsDelivr (FluidR3_GM)
      // createMidiJsPlayerUsingTone will load the instrument JS, decode embedded
      // base64 sample blobs using Tone's AudioContext, and return a small player
      // with triggerAttackRelease(note, duration).
      try {
        toneInstrument = await createMidiJsPlayerUsingTone(currentInstrument);
      } catch (soundfontErr) {
        console.warn('Failed to load midi-js soundfont for', currentInstrument, soundfontErr);
        // Fallback to basic Tone.js synth if soundfont loading fails
        if (name.includes('fm') || name.includes('electric')) {
          toneInstrument = new Tone.PolySynth(Tone.FMSynth, { volume: masterVolume }).toDestination();
        } else if (name.includes('am') || name.includes('voice')) {
          toneInstrument = new Tone.PolySynth(Tone.AMSynth, { volume: masterVolume }).toDestination();
        } else if (name.includes('saw') || name.includes('lead')) {
          toneInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'sawtooth' }, volume: masterVolume }).toDestination();
        } else if (name.includes('organ')) {
          toneInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'square' }, volume: masterVolume }).toDestination();
        } else {
          // default: versatile poly synth
          toneInstrument = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, volume: masterVolume }).toDestination();
        }
      }
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
  } catch (e) { console.warn('Error starting Tone.js', e);
    
    // ignore
  }
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) { 
      console.warn('Error resuming AudioContext', e);
      // ignore - resume may require user gesture
    }
  }
};

type NoteRange = { from: MidiNoteName; to: MidiNoteName };


const getNotesBetween = (from: MidiNoteName, to: MidiNoteName) => {
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
 * Unified function to set and preload an instrument.
 * This is the ONLY exported function to use for instrument changes.
 * 
 * @param instrumentName The instrument to load (e.g., 'acoustic_grand_piano', 'violin')
 * @param predecodeNotes Optional list of notes or range to pre-decode (defaults to C3..C5)
 * @param progressCallback Optional callback for progress updates
 * @returns Promise<boolean> indicating success
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
    // Log when changing instrument
    if (instrumentToUse !== currentInstrument) {
      console.info(`Changing instrument from ${currentInstrument} to ${instrumentToUse}`);
    } else {
      console.info(`Loading instrument ${instrumentToUse}`);
    }
    
    try {
      await ensureContextRunning();
      
      // Dispose old instrument if changing
      if (instrumentToUse !== currentInstrument) {
        if (toneInstrument && typeof toneInstrument.dispose === 'function') {
          try { toneInstrument.dispose(); } catch (_) {}
        }
        toneInstrument = null;
        currentInstrument = instrumentToUse;
      }
      
      // Create the new instrument
      await createToneInstrument(instrumentToUse);

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
      
      // Log successful loading
      console.info(`Successfully loaded instrument ${instrumentToUse}`);
      return true;
    } catch (err) {
      // Log loading error
      console.error(`Failed to load instrument ${instrumentToUse}:`, err);
      // Don't show alert here - let the caller decide
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

export const isAudioInitialized = (instrument?: string) => {
  const targetInstrument = instrument || currentInstrument;
  return toneLoaded && toneInstrument !== null && currentInstrument === targetInstrument;
};

export const playNote = async (midiNote: MidiNoteNumber | MidiNoteName, durationSecs: number = 0.7, when?: number) => {
  // note may be a MIDI number (preferred), or a note name like 'C4'
  let noteName: string | null = null;
  if (typeof midiNote === 'number') {
    noteName = midiToNoteName(midiNote);
  } else {
      // assume the caller passed a note name like 'C4'
      noteName = midiNote as string;
  }

  if (!noteName) {
    console.error('Invalid note for playNote', midiNote);
    return;
  }
  //console.log(`Playing note ${noteName} for ${durationSecs} at ${when}; now is ${getAudioContext().currentTime} / ${(window as any).Tone.now()}`);

  await ensureContextRunning();
  try {
    // Ensure we're using the current instrument
    const player = await createToneInstrument(currentInstrument);

    // Usually this is what we use
    if (player && typeof player.triggerAttackRelease === 'function') {
      // Tone.js player supports optional when scheduling in our midi-js wrapper
      player.triggerAttackRelease(noteName, durationSecs, when);
      return;
    }

    // PolySynth may expose 'triggerAttackRelease' on its voice or directly; try Tone's Transport-scheduled play as fallback
    if (player && typeof player.triggerAttack === 'function') {
      console.debug(`  using triggerAttack`);
      // Tone's PolySynth scheduling: use Tone.now() relative if available
      try {
        const Tone = (window as any).Tone;
        if (when && Tone && typeof Tone.now === 'function') {
          const offset = when - (Tone.now ? Tone.now() : 0);
          console.debug(`  scheduling note ${noteName} at Tone offset ${offset} (when=${when}, now=${Tone.now()})`);
          if (offset <= 0) player.triggerAttackRelease(noteName, durationSecs);
          else setTimeout(() => player.triggerAttackRelease(noteName, durationSecs), Math.max(0, Math.round(offset * 1000)));
        } else {
          player.triggerAttackRelease(noteName, durationSecs);
        }
      } catch (e) { 
        console.warn('Error scheduling note with Tone.js', e);
        player.triggerAttackRelease(noteName, durationSecs);
      }
      return;
    }

    console.error('Tone instrument is not available to play note', noteName);
    try { window.alert('Audio not available: unable to play note.'); } catch (_) {}
  } catch (err) {
    console.error('Error playing note', err);
    try { window.alert('Error while trying to play sound. See console for details.'); } catch (_) {}
  }
};

type SequenceItem = { note: MidiNoteNumber | MidiNoteName; duration?: number; gapAfter?: number };

export const playSequence = async (items: Array<SequenceItem | MidiNoteNumber | MidiNoteName>, 
    defaultGap: number = 0.1, defaultDuration: number = 0.7) => {
  // Convert items to SequenceItem
  const seq: SequenceItem[] = items.map(it => {
    if (typeof it === 'number' || typeof it === 'string') return { note: it, duration: defaultDuration, gapAfter: defaultGap };
    return { note: it.note, duration: it.duration ?? defaultDuration, gapAfter: it.gapAfter ?? defaultGap };
  });

  // Schedule using AudioContext currentTime so notes don't cut off each other
  const Tone = (window as any).Tone;
  let time = Tone && typeof Tone.now === 'function' ? Tone.now() : getAudioContext().currentTime;
  time += 0.05; // small scheduling offset
  for (let i = 0; i < seq.length; i++) {
    const it = seq[i];
    // schedule each note at 'time'
    // playNote will accept an absolute 'when' argument in audio context time
    playNote(it.note, it.duration ?? defaultDuration, time).catch((e) => {console.warn('playNote failed in playSequence', e);});
    // advance time by duration + gapAfter
    time = time + (it.duration ?? defaultDuration) + (it.gapAfter ?? defaultGap);
  }
  // return a promise that resolves after the sequence finished
  const totalDuration = seq.reduce((s, it) => s + (it.duration ?? defaultDuration) + (it.gapAfter ?? defaultGap), 0);
  return new Promise((resolve) => setTimeout(resolve, Math.round(totalDuration * 1000)));
};


/**
 * Start a continuous background drone on the given note (one octave lower).
 * Uses a square wave PolySynth from Tone.js.
 */
export const startDrone = async (noteNameOrMidi: MidiNoteName | MidiNoteNumber, volume: number) => {
  await loadToneScript();
  const Tone = (window as any).Tone;
  if (!Tone) {
    console.error('Tone.js not loaded, cannot start drone');
    return;
  }

  // Stop any existing drone first
  stopDrone();

  // Convert midi to note name if needed
  let noteName: MidiNoteName;
  if (typeof noteNameOrMidi === 'number') {
    noteName = midiToNoteName(noteNameOrMidi);
  } else {
    noteName = noteNameOrMidi;
  }

  // Lower by one octave
  const midi = noteNameToMidi(noteName);
  const lowerOctaveNote = midiToNoteName(midi - 12);

  // Create a PolySynth with wave oscillator
  // sine, square, triangle, or sawtooth
  droneSynth = new Tone.PolySynth(Tone.FMSynth, {
    oscillator: {
      type: 'sine'
    },
    envelope: {
      attack: 0.5,
      decay: 0,
      sustain: 1,
      release: 0.5
    },
    volume: volume
  }).toDestination();
  
  droneSynth.volume.value = volume;
  // Start the continuous note
  droneSynth.triggerAttack(lowerOctaveNote);
};

/**
 * Stop the background drone if it's playing.
 */
export const stopDrone = () => {
  if (droneSynth) {
    try {
      droneSynth.releaseAll();
      droneSynth.dispose();
    } catch (e) {
      console.error('Error stopping drone:', e);
    }
    droneSynth = null;
  }
};

/**
 * Adjust the volume of the currently playing drone.
 * @param volume Volume in decibels (e.g., -26 for default, -12 for louder, -40 for quieter)
 */
export const setDroneVolume = (volume: number) => {
  if (droneSynth) {
    droneSynth.volume.value = volume;
  }
};

/**
 * Set the master volume for notes (not drone).
 * @param volume Volume in decibels (e.g., -8 for default, 0 for normal volume, -20 for quiet, +20 for quite a lot louder)
 */
export const setMasterVolume = (volume: number) => {
  masterVolume = volume;
  
  // Update Tone.js instrument volume if it has a volume property
  if (toneInstrument && toneInstrument.volume) {
    toneInstrument.volume.value = volume;
  }
  
  // Update master gain node for midi-js player
  // Convert dB to gain: gain = 10^(dB/20)
  if (masterGainNode) {
    masterGainNode.gain.value = Math.pow(10, volume / 20);
  }
};

/**
 * Get the current master volume setting.
 */
export const getMasterVolume = () => masterVolume;

/**
 * Stop currently playing instrument notes
 */
export const stopSounds = () => {
  
  // Stop instrument notes (if using Tone.js PolySynth)
  if (toneInstrument) {
    try {
      if (typeof toneInstrument.releaseAll === 'function') {
        toneInstrument.releaseAll();
      }
    } catch (e) {
      console.warn('Error stopping instrument sounds:', e);
    }
  }
};
