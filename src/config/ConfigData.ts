// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

import { MidiNoteName, SemitoneOffset, semitonesToSolfege } from "@/utils/audio";

export enum ExerciseType {
  MelodyRecognition = "Melody recognition",
  SingleNoteRecognition = "Single note recognition",
  IntervalComparison = "Interval comparison",
}

// Property metadata for automatic serialization/comparison
interface PropertyMetadata<T = any> {
  key: keyof ConfigData;
  defaultValue: T;
  queryParam?: string; // URL parameter name (if omitted, property won't be serialized)
  equals?: (a: T, b: T) => boolean; // Custom equality check
  serialize?: (value: T) => string; // Custom serialization to URL
  deserialize?: (value: string) => T; // Custom deserialization from URL
  changeLabel?: string; // Label for change tracking (if omitted, property won't appear in changes)
  formatChange?: (prev: T, curr: T) => string; // Custom change formatting
}

// Define all properties with their metadata in one place
const PROPERTY_METADATA: PropertyMetadata[] = [
  {
    key: 'exerciseType',
    defaultValue: ExerciseType.MelodyRecognition,
    queryParam: 'exercise',
    changeLabel: 'Exercise',
    formatChange: (prev, curr) => `${prev} → ${curr}`,
  },
  {
    key: 'selectedNotes',
    defaultValue: [0, 2, 4, 5, 7, 9, 11] as SemitoneOffset[],
    queryParam: 'notes',
    equals: (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()),
    serialize: (value) => value.join(','),
    deserialize: (value) => value.split(',').map(n => parseInt(n, 10)) as SemitoneOffset[],
    changeLabel: 'Selected notes',
    formatChange: (prev, curr) => {
      const prevNotes = prev.map(n => semitonesToSolfege(n)).join(", ");
      const currNotes = curr.map(n => semitonesToSolfege(n)).join(", ");
      return `[${prevNotes}] → [${currNotes}]`;
    },
  },
  {
    key: 'numberOfNotes',
    defaultValue: 3,
    queryParam: 'n',
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10),
    changeLabel: 'Notes',
    formatChange: (prev, curr) => `${prev} → ${curr}`,
  },
  {
    key: 'playExtraNotes',
    defaultValue: 0,
    queryParam: 'extra',
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10),
    changeLabel: 'Extra notes',
    formatChange: (prev, curr) => `${prev} → ${curr}`,
  },
  {
    key: 'consecutiveIntervals',
    defaultValue: [0, 11] as [SemitoneOffset, SemitoneOffset],
    queryParam: 'int',
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    serialize: (value) => value.join(','),
    deserialize: (value) => {
      const parts = value.split(',').map(n => parseInt(n, 10));
      return parts.length === 2 ? [parts[0], parts[1]] as [SemitoneOffset, SemitoneOffset] : [0, 11] as [SemitoneOffset, SemitoneOffset];
    },
    changeLabel: 'Consecutive intervals',
    formatChange: (prev, curr) => `${prev[0]}-${prev[1]} → ${curr[0]}-${curr[1]}`,
  },
  {
    key: 'questionNoteRange',
    defaultValue: [0, 12] as [SemitoneOffset, SemitoneOffset],
    queryParam: 'range',
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    serialize: (value) => value.join(','),
    deserialize: (value) => {
      const parts = value.split(',').map(n => parseInt(n, 10));
      return parts.length === 2 ? [parts[0], parts[1]] as [SemitoneOffset, SemitoneOffset] : [0, 12] as [SemitoneOffset, SemitoneOffset];
    },
  },
  {
    key: 'comparisonIntervals',
    defaultValue: [2, 3] as [SemitoneOffset, SemitoneOffset],
    queryParam: 'cmpInt',
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    serialize: (value) => value.join(','),
    deserialize: (value) => {
      const parts = value.split(',').map(n => parseInt(n, 10));
      return parts.length === 2 ? [parts[0], parts[1]] as [SemitoneOffset, SemitoneOffset] : [2, 3] as [SemitoneOffset, SemitoneOffset];
    },
  },
  {
    key: 'tempo',
    defaultValue: 200,
    queryParam: 'tempo',
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10),
    changeLabel: 'Tempo',
    formatChange: (prev, curr) => `${prev} → ${curr}`,
  },
  {
    key: 'rhythm',
    defaultValue: 'random' as 'fixed' | 'random',
    queryParam: 'rhythm',
    deserialize: (value) => (value === 'fixed' || value === 'random') ? value : 'random',
    changeLabel: 'Rhythm',
    formatChange: (prev, curr) => `${prev} → ${curr}`,
  },
  {
    key: 'droneType',
    defaultValue: 'none' as 'none' | 'root',
    queryParam: 'drone',
    deserialize: (value) => (value === 'none' || value === 'root') ? value : 'none',
    changeLabel: 'Drone',
    formatChange: (prev, curr) => `${prev} → ${curr}`,
  },
  {
    key: 'referenceType',
    defaultValue: 'root' as 'root' | 'arpeggio',
    queryParam: 'ref',
    deserialize: (value) => (value === 'root' || value === 'arpeggio') ? value : 'root',
  },
  {
    key: 'rootNotePitch',
    defaultValue: 'C4' as MidiNoteName,
    queryParam: 'root',
  },
  {
    key: 'instrument',
    defaultValue: 'acoustic_grand_piano',
    queryParam: 'inst',
  },
  {
    key: 'instrumentMode',
    defaultValue: 'single' as 'single' | 'random',
    queryParam: 'mode',
    deserialize: (value) => (value === 'single' || value === 'random') ? value : 'single',
  },
];

export class ConfigData {
  exerciseType?: ExerciseType = ExerciseType.MelodyRecognition;

  selectedNotes: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11];
  numberOfNotes: number = 3;
  playExtraNotes: number = 0;
  consecutiveIntervals: [SemitoneOffset, SemitoneOffset] = [0, 11];
  questionNoteRange: [SemitoneOffset, SemitoneOffset] = [0, 12];
  comparisonIntervals: [SemitoneOffset, SemitoneOffset] = [2, 3];
  tempo: number = 200;
  rhythm: "fixed" | "random" = "random";
  droneType: "none" | "root" = "none";
  referenceType: "root" | "arpeggio" = "root";
  rootNotePitch: MidiNoteName = "C4";
  instrument: string = "acoustic_grand_piano";
  instrumentMode: "single" | "random" = "single";

  /** Get a general name for exercises "like this one" that will be displayed to users, and used to group historic results. */
  getExerciseType(): ExerciseType {
    if (this.exerciseType) return this.exerciseType;
    if (this.numberOfNotes === 1) return ExerciseType.SingleNoteRecognition;
    return ExerciseType.MelodyRecognition;
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
      let current = note;
      while (current - 12 >= minOffset) {
        current -= 12;
      }
      
      while (current <= maxOffset) {
        if (current >= minOffset) {
          pool.push(current);
        }
        current += 12;
      }
    }
    if (pool.length === 0) {
      throw new Error("There are no notes that match both the selectedNotes and questionNoteRange settings.");
    }
    
    return pool.sort((a, b) => a - b);
  }

  constructor(partial?: Partial<ConfigData>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  equals(other: ConfigData): boolean {
    return PROPERTY_METADATA.every(meta => {
      const a = this[meta.key];
      const b = other[meta.key];
      const equalsFn = meta.equals || ((x, y) => x === y);
      return equalsFn(a, b);
    });
  }

  /** Helper to get a human list of settings changes. */
  static getSettingsChanges(current: ConfigData | undefined, previous: ConfigData | undefined): string[] {
    if (!current || !previous) return [];
    
    try {
      const changes: string[] = [];
      
      // Special case for exerciseType since we use getExerciseType()
      if (current.getExerciseType() !== previous.getExerciseType()) {
        const meta = PROPERTY_METADATA.find(m => m.key === 'exerciseType')!;
        if (meta.changeLabel && meta.formatChange) {
          changes.push(`${meta.changeLabel}: ${meta.formatChange(previous.getExerciseType(), current.getExerciseType())}`);
        }
      }

      // All other properties
      for (const meta of PROPERTY_METADATA) {
        if (meta.key === 'exerciseType' || !meta.changeLabel) continue;
        
        const currValue = current[meta.key];
        const prevValue = previous[meta.key];
        const equalsFn = meta.equals || ((x, y) => x === y);
        
        if (!equalsFn(currValue, prevValue)) {
          const formatted = meta.formatChange 
            ? meta.formatChange(prevValue, currValue)
            : `${prevValue} → ${currValue}`;
          changes.push(`${meta.changeLabel}: ${formatted}`);
        }
      }
      
      return changes;
    } catch (e) {
      console.error("Error computing settings changes:", e);
      return ["Configuration options changed due to new app version"];
    }
  }

  /** Encode non-default settings to URL query parameters */
  toQueryParams(): URLSearchParams {
    const defaults = new ConfigData();
    const params = new URLSearchParams();

    for (const meta of PROPERTY_METADATA) {
      if (!meta.queryParam) continue;
      
      const value = this[meta.key];
      const defaultValue = defaults[meta.key];
      const equalsFn = meta.equals || ((x, y) => x === y);
      
      if (!equalsFn(value, defaultValue)) {
        const serialized = meta.serialize ? meta.serialize(value) : String(value);
        params.set(meta.queryParam, serialized);
      }
    }

    return params;
  }

  /** Create ConfigData from URL query parameters, merging with defaults */
  static fromQueryParams(searchParams: URLSearchParams): ConfigData {
    const defaults = new ConfigData();
    const partial: any = {};

    for (const meta of PROPERTY_METADATA) {
      if (!meta.queryParam) continue;
      
      const paramValue = searchParams.get(meta.queryParam);
      if (paramValue !== null) {
        try {
          partial[meta.key] = meta.deserialize 
            ? meta.deserialize(paramValue) 
            : paramValue;
        } catch (e) {
          console.error(`Error deserializing ${meta.key}:`, e);
        }
      }
    }

    return new ConfigData({ ...defaults, ...partial });
  }

  
}

// Constraints on valid values, used by the UI
export const CONSTRAINTS = {
  numberOfNotes: { min: 1, max: 10 },
  playExtraNotes: { min: 0, max: 5 },
  tempo: { min: 40, max: 400, step: 10 },
  consecutiveIntervals: { min: 0, max: 12+12 },
  questionNoteRange: { min: -12, max: 24 }, // -1 octave to +2 octaves
  comparisonIntervals: { min: 1, max: 12 }, // 1 semitone (minor 2nd) to 12 semitones (octave)
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

