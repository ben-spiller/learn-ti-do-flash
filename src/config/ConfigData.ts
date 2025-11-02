// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

import { MidiNoteName, SemitoneOffset, semitonesToSolfege } from "@/utils/audio";

export class ConfigData {
  selectedNotes: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11]; // Full major scale - MIDI intervals relative to root (0-11)
  numberOfNotes: number = 3; // Number of notes per question (2-10)
  playExtraNotes: number = 0; // Extra random notes to play at end (0-5)
  consecutiveIntervals: [SemitoneOffset, SemitoneOffset] = [1, 11]; // default - go up to an octave
  questionNoteRange: [SemitoneOffset, SemitoneOffset] = [0, 12]; // Range for question notes: -12 (Do -1 octave) to +24 (Do +2 octaves)
  tempo: number = 200; 
  rhythm: "fixed" | "random" = "random";
  droneType: "none" | "root" = "none";
  referenceType: "root" | "arpeggio" = "root";
  rootNotePitch: MidiNoteName = "C4"; // e.g., "C4"
  instrument: string = "acoustic_grand_piano"; // Instrument slug (used when instrumentMode is "single")
  instrumentMode: "single" | "random" = "single"; // Whether to use a single instrument or random from favourites

  /** Get a general name for exercises "like this one" that will be displayed to users, and used to group historic results */
  getExerciseName(): string {
    if (this.numberOfNotes === 1) return "Single note recognition";
    return "Melody recognition"
  }

  /** Pick the instrument to use for this session based on the instrument mode */
  pickInstrument(favouriteInstruments: string[]): string {
    if (this.instrumentMode === "random" && favouriteInstruments.length > 0) {
      const randomIndex = Math.floor(Math.random() * favouriteInstruments.length);
      return favouriteInstruments[randomIndex];
    }
    return this.instrument;
  }

  /** Get the pool of all possible notes for questions, expanding selectedNotes across the questionNoteRange */
  getNotePool(): SemitoneOffset[] {
    const pool: SemitoneOffset[] = [];
    const [minOffset, maxOffset] = this.questionNoteRange;
    
    for (const note of this.selectedNotes) {
      // Find the lowest octave of this note within range
      let current = note;
      while (current - 12 >= minOffset) {
        current -= 12;
      }
      
      // Add all octaves of this note within range
      while (current <= maxOffset) {
        if (current >= minOffset) {
          pool.push(current);
        }
        current += 12;
      }
    }
    
    return pool.sort((a, b) => a - b);
  }

  constructor(partial?: Partial<ConfigData>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  equals(other: ConfigData): boolean {
    return (
      JSON.stringify(other.selectedNotes.sort()) === JSON.stringify(this.selectedNotes.sort()) &&
      other.numberOfNotes === this.numberOfNotes &&
      other.playExtraNotes === this.playExtraNotes &&
      JSON.stringify(other.consecutiveIntervals) === JSON.stringify(this.consecutiveIntervals) &&
      JSON.stringify(other.questionNoteRange) === JSON.stringify(this.questionNoteRange) &&
      other.tempo === this.tempo &&
      other.rhythm === this.rhythm &&
      other.droneType === this.droneType &&
      other.referenceType === this.referenceType &&
      other.rootNotePitch === this.rootNotePitch &&
      other.instrument === this.instrument &&
      other.instrumentMode === this.instrumentMode
    );
  }

  /** Helper to get a human list of settings changes. */
  static getSettingsChanges(current: ConfigData | undefined, previous: ConfigData | undefined): string[] {
    if (!current || !previous) return [];
    
    try {
      const changes: string[] = [];
      if (current.numberOfNotes !== previous.numberOfNotes) {
        changes.push(`Notes: ${previous.numberOfNotes} → ${current.numberOfNotes}`);
      }
      if (current.tempo !== previous.tempo) {
        changes.push(`Tempo: ${previous.tempo} → ${current.tempo}`);
      }
      if (JSON.stringify(current.consecutiveIntervals) !== JSON.stringify(previous.consecutiveIntervals)) {
        changes.push(`Consecutive intervals: ${previous.consecutiveIntervals[0]}-${previous.consecutiveIntervals[1]} → ${current.consecutiveIntervals[0]}-${current.consecutiveIntervals[1]}`);
      }
      if (current.rhythm !== previous.rhythm) {
        changes.push(`Rhythm: ${previous.rhythm} → ${current.rhythm}`);
      }
      if (current.droneType !== previous.droneType) {
        changes.push(`Drone: ${previous.droneType} → ${current.droneType}`);
      }
      if (current.playExtraNotes !== previous.playExtraNotes) {
        changes.push(`Extra notes: ${previous.playExtraNotes} → ${current.playExtraNotes}`);
      }
      if (JSON.stringify(current.selectedNotes.sort()) !== JSON.stringify(previous.selectedNotes.sort())) {
        const prevNotes = previous.selectedNotes.map(n => semitonesToSolfege(n)).join(", ");
        const currNotes = current.selectedNotes.map(n => semitonesToSolfege(n)).join(", ");
        changes.push(`Selected notes: [${prevNotes}] → [${currNotes}]`);
      }
      
      return changes;
    } catch (e) {
      console.error("Error computing settings changes:", e);
      return ["Configuration options changed due to new app version"];
    }
  };

  /** Encode non-default settings to URL query parameters */
  toQueryParams(): URLSearchParams {
    const defaults = new ConfigData();
    const params = new URLSearchParams();

    if (JSON.stringify(this.selectedNotes.sort()) !== JSON.stringify(defaults.selectedNotes.sort())) {
      params.set('notes', this.selectedNotes.join(','));
    }
    if (this.numberOfNotes !== defaults.numberOfNotes) {
      params.set('n', this.numberOfNotes.toString());
    }
    if (this.playExtraNotes !== defaults.playExtraNotes) {
      params.set('extra', this.playExtraNotes.toString());
    }
    if (JSON.stringify(this.consecutiveIntervals) !== JSON.stringify(defaults.consecutiveIntervals)) {
      params.set('int', this.consecutiveIntervals.join(','));
    }
    if (JSON.stringify(this.questionNoteRange) !== JSON.stringify(defaults.questionNoteRange)) {
      params.set('range', this.questionNoteRange.join(','));
    }
    if (this.tempo !== defaults.tempo) {
      params.set('tempo', this.tempo.toString());
    }
    if (this.rhythm !== defaults.rhythm) {
      params.set('rhythm', this.rhythm);
    }
    if (this.droneType !== defaults.droneType) {
      params.set('drone', this.droneType);
    }
    if (this.referenceType !== defaults.referenceType) {
      params.set('ref', this.referenceType);
    }
    if (this.rootNotePitch !== defaults.rootNotePitch) {
      params.set('root', this.rootNotePitch);
    }
    if (this.instrument !== defaults.instrument) {
      params.set('inst', this.instrument);
    }
    if (this.instrumentMode !== defaults.instrumentMode) {
      params.set('mode', this.instrumentMode);
    }

    return params;
  }

  /** Create ConfigData from URL query parameters, merging with defaults */
  static fromQueryParams(searchParams: URLSearchParams): ConfigData {
    const defaults = new ConfigData();
    const partial: Partial<ConfigData> = {};

    const notes = searchParams.get('notes');
    if (notes) {
      partial.selectedNotes = notes.split(',').map(n => parseInt(n, 10)) as SemitoneOffset[];
    }

    const n = searchParams.get('n');
    if (n) partial.numberOfNotes = parseInt(n, 10);

    const extra = searchParams.get('extra');
    if (extra) partial.playExtraNotes = parseInt(extra, 10);

    const int = searchParams.get('int');
    if (int) {
      const parts = int.split(',').map(n => parseInt(n, 10));
      if (parts.length === 2) {
        partial.consecutiveIntervals = [parts[0] as SemitoneOffset, parts[1] as SemitoneOffset];
      }
    }

    const range = searchParams.get('range');
    if (range) {
      const parts = range.split(',').map(n => parseInt(n, 10));
      if (parts.length === 2) {
        partial.questionNoteRange = [parts[0] as SemitoneOffset, parts[1] as SemitoneOffset];
      }
    }

    const tempo = searchParams.get('tempo');
    if (tempo) partial.tempo = parseInt(tempo, 10);

    const rhythm = searchParams.get('rhythm');
    if (rhythm && (rhythm === 'fixed' || rhythm === 'random')) {
      partial.rhythm = rhythm;
    }

    const drone = searchParams.get('drone');
    if (drone && (drone === 'none' || drone === 'root')) {
      partial.droneType = drone;
    }

    const ref = searchParams.get('ref');
    if (ref && (ref === 'root' || ref === 'arpeggio')) {
      partial.referenceType = ref;
    }

    const root = searchParams.get('root');
    if (root) partial.rootNotePitch = root as MidiNoteName;

    const inst = searchParams.get('inst');
    if (inst) partial.instrument = inst;

    const mode = searchParams.get('mode');
    if (mode && (mode === 'single' || mode === 'random')) {
      partial.instrumentMode = mode;
    }

    return new ConfigData({ ...defaults, ...partial });
  }

  
}

// Constraints on valid values, used by the UI
export const CONSTRAINTS = {
  numberOfNotes: { min: 1, max: 10 },
  playExtraNotes: { min: 0, max: 5 },
  tempo: { min: 40, max: 300, step: 5 },
  consecutiveIntervals: { min: 1, max: 12+12 },
  questionNoteRange: { min: -12, max: 24 }, // -1 octave to +2 octaves
} as const;

// All available instruments from FluidR3_GM soundfont
export const INSTRUMENT_SLUGS = [
  "acoustic_grand_piano",
  "bright_acoustic_piano",
  "electric_grand_piano",
  "electric_piano_1",
  "electric_piano_2",
  "clavinet",
  "celesta",
  "glockenspiel",
  "drawbar_organ",
  "percussive_organ",
  "rock_organ",
  "church_organ",
  "reed_organ",
  "harmonica",
  "acoustic_guitar_nylon",
  "acoustic_guitar_steel",
  "electric_guitar_jazz",
  "electric_guitar_clean",
  "electric_guitar_muted",
  "overdriven_guitar",
  "distortion_guitar",
  "acoustic_bass",
  "electric_bass_finger",
  "electric_bass_pick",
  "fretless_bass",
  "slap_bass_1",
  "slap_bass_2",
  "synth_bass_1",
  "synth_bass_2",
  "violin",
  "viola",
  "cello",
  "contrabass",
  "string_ensemble_1",
  "string_ensemble_2",
  "synth_strings_1",
  "synth_strings_2",
  "choir_aahs",
  "voice_oohs",
  "synth_choir",
  "trumpet",
  "trombone",
  "tuba",
  "muted_trumpet",
  "french_horn",
  "synth_brass_1",
  "synth_brass_2",
  "soprano_sax",
  "alto_sax",
  "tenor_sax",
  "baritone_sax",
  "oboe",
  "english_horn",
  "bassoon",
  "clarinet",
  "piccolo",
  "flute",
  "recorder",
  "pan_flute",
  "lead_1_square",
  "lead_2_sawtooth",
  "lead_3_calliope",
  "lead_4_chiff",
  "lead_5_charang",
  "lead_6_voice",
  "lead_7_fifths",
  "lead_8_bass__lead",
  "pad_1_new_age",
  "pad_2_warm",
  "pad_3_polysynth",
  "pad_4_choir",
  "pad_5_bowed",
  "pad_6_metallic",
  "pad_7_halo",
  "pad_8_sweep",
  "sitar",
  "banjo",
  "shamisen",
  "koto",
  "kalimba",
  "bagpipe",
  "fiddle",
  "shanai",
  "agogo"
] as const;

/** Convert instrument slug to human-friendly label */
export function formatInstrumentName(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Instrument options with formatted labels
export const INSTRUMENT_OPTIONS = INSTRUMENT_SLUGS.map(slug => ({
  slug,
  label: formatInstrumentName(slug)
}));

