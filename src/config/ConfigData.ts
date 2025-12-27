// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

import { MidiNoteName, SemitoneOffset, semitonesToSolfege } from "@/utils/audio";
import { getFavouriteInstruments } from "@/utils/instrumentStorage";

/** A pair of semi-tone offsets, e.g. for an range of possible notes relative to the root */
type SemitonePair = [SemitoneOffset, SemitoneOffset];

export enum ExerciseType {
  SingleNoteRecognition = "Single note recognition",
  MelodyRecognition = "Melody recognition",
  IntervalComparison = "Interval comparison",
}

/** True for exercises where there is a reference note and a drone can be configured */
export function exerciseIsTonal(type: ExerciseType) {
  return type !== ExerciseType.IntervalComparison;
}

// Property metadata for automatic serialization/comparison
class PropertyMetadata<T = any> {
  key: keyof ConfigData;
  defaultValue: T;
  omitFromChangeSummary?: boolean;
  serialize?: (value: T) => string; // Custom serialization to URL, also used for equality
  deserialize?: (value: string) => T; // Custom deserialization from URL
}

// Define all properties with their metadata in one place
const PROPERTY_METADATA: PropertyMetadata[] = [
  {
    key: 'exerciseType',
    defaultValue: ExerciseType.MelodyRecognition,
  },
  {
    key: 'selectedNotes',
    defaultValue: [0, 2, 4, 5, 7, 9, 11] as SemitoneOffset[],
    serialize: (value) => value.sort().join(','),
    deserialize: (value) => value.split(',').map(n => parseInt(n, 10)) as SemitoneOffset[],
  },
  {
    key: 'numberOfNotes',
    defaultValue: 3,
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10),
  },
  {
    key: 'playExtraNotes',
    defaultValue: 0,
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10),
  },
  {
    key: 'consecutiveIntervals',
    defaultValue: [0, 11] as [SemitoneOffset, SemitoneOffset],
    serialize: (value) => value.join(','),
    deserialize: (value) => {
      const parts = value.split(',').map(n => parseInt(n, 10));
      return parts.length === 2 ? [parts[0], parts[1]] as [SemitoneOffset, SemitoneOffset] : [0, 11] as [SemitoneOffset, SemitoneOffset];
    },
  },
  {
    key: 'questionNoteRange',
    defaultValue: [0, 12] as [SemitoneOffset, SemitoneOffset],
    serialize: (value) => value.join(','),
    deserialize: (value) => {
      const parts = value.split(',').map(n => parseInt(n, 10));
      return parts.length === 2 ? [parts[0], parts[1]] as [SemitoneOffset, SemitoneOffset] : [0, 12] as [SemitoneOffset, SemitoneOffset];
    },
  },
  {
    key: 'intervalToFind',
    defaultValue: 3 as SemitoneOffset,
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10) as SemitoneOffset,
  },
  {
    key: 'intervalComparisonRange',
    defaultValue: [2, 5] as [SemitoneOffset, SemitoneOffset],
    serialize: (value) => value.join(','),
    deserialize: (value) => {
      const parts = value.split(',').map(n => parseInt(n, 10));
      return parts.length === 2 ? [parts[0], parts[1]] as [SemitoneOffset, SemitoneOffset] : [2, 5] as [SemitoneOffset, SemitoneOffset];
    },
  },
  {
    key: 'intervalDirection',
    defaultValue: 'random' as 'random' | 'ascending' | 'descending',
    deserialize: (value) => (value === 'random' || value === 'ascending' || value === 'descending') ? value : 'random',
  },
  {
    key: 'tempo',
    defaultValue: 200,
    serialize: (value) => value.toString(),
    deserialize: (value) => parseInt(value, 10),
  },
  {
    key: 'rhythm',
    defaultValue: 'random' as 'fixed' | 'random',
    deserialize: (value) => (value === 'fixed' || value === 'random') ? value : 'random',
  },
  {
    key: 'droneType',
    defaultValue: 'none' as 'none' | 'root',
    deserialize: (value) => (value === 'none' || value === 'root') ? value : 'none',
  },
  {
    key: 'rootNotePitch',
    defaultValue: 'C4' as MidiNoteName,
  },
  {
    key: 'instrument',
    omitFromChangeSummary: true,
    defaultValue: 'acoustic_grand_piano',
  },
  {
    key: 'instrumentMode',
    omitFromChangeSummary: true,
    defaultValue: 'random' as 'single' | 'random',
    deserialize: (value) => (value === 'single' || value === 'random') ? value : 'single',
  },
];

export class ConfigData {
  /** A general name for exercises "like this one" that will be displayed to users, and used to group historic results. */
  exerciseType?: ExerciseType = ExerciseType.MelodyRecognition;

  selectedNotes: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11];
  numberOfNotes: number = 3;
  playExtraNotes: number = 0;
  consecutiveIntervals: SemitonePair = [0, 11];
  questionNoteRange: SemitonePair = [0, 12];
  intervalToFind: SemitoneOffset = 3;
  intervalComparisonRange: SemitonePair = [2, 5];
  intervalDirection: "random" | "ascending" | "descending" = "random";
  tempo: number = 200;
  rhythm: "fixed" | "random" = "random";
  droneType: "none" | "root" = "none";
  rootNotePitch: MidiNoteName = "C4";
  /** The instrument to use for this session. May be picked by the home/settings page, or when directly entering a practice page */
  instrument?: string = "acoustic_grand_piano";
  instrumentMode: "single" | "random" = "random";

  /** Pick the instrument to use for this session based on the instrument mode */
  pickInstrument(favouriteInstruments?: string[]): string {
    if (!favouriteInstruments) {
      favouriteInstruments = getFavouriteInstruments();
    }
    if (this.instrument) return this.instrument;
    if (this.instrumentMode === "random" && favouriteInstruments.length > 0) {
      const randomIndex = Math.floor(Math.random() * favouriteInstruments.length);
      this.instrument = favouriteInstruments[randomIndex];
    } else { this.instrument = "acoustic_grand_piano"; }
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

  /** Get default settings for a specific exercise type */
  static getDefaults(exerciseType: ExerciseType): ConfigData {
    const defaults = new ConfigData();
    defaults.exerciseType = exerciseType;

    switch (exerciseType) {
      case ExerciseType.MelodyRecognition:
        defaults.numberOfNotes = 3;
        defaults.selectedNotes = [0, 2, 4, 5, 7, 9, 11];
        defaults.questionNoteRange = [0, 12];
        defaults.rhythm = 'random';
        defaults.droneType = 'none';
        break;

      case ExerciseType.SingleNoteRecognition:
        defaults.numberOfNotes = 1;
        defaults.selectedNotes = [0, 2, 4, 5, 7, 9, 11];
        defaults.questionNoteRange = [0, 12];
        defaults.rhythm = 'fixed';
        defaults.droneType = 'root';
        break;

      case ExerciseType.IntervalComparison:
        defaults.numberOfNotes = 4;
        defaults.intervalToFind = 3;
        defaults.intervalComparisonRange = [5, 5];
        defaults.tempo = 60; // start a lot slower cos this is a hard exercise
        defaults.intervalDirection = 'random';
        defaults.rhythm = 'fixed';
        defaults.droneType = 'none';
        break;
    }

    return defaults;
  }

  equals(other: ConfigData): boolean {
    return PROPERTY_METADATA.every(meta => {
      const a = this[meta.key];
      const b = other[meta.key];
      return serialize(meta, a) === serialize(meta, b);
    });
  }

  /** Helper to get a human list of settings changes. */
  static getSettingsChanges(current: ConfigData | undefined, previous: ConfigData | undefined): string[] {
    if (!current || !previous) return [];
    
    try {
      const changes: string[] = [];

      // All other properties
      for (const meta of PROPERTY_METADATA) {
        if (meta.omitFromChangeSummary) continue;

        if (!(meta.key in previous)) continue; // in case of new app version
        
        const currValue = current[meta.key];
        const prevValue = previous[meta.key];
        
        if (serialize(meta, prevValue) !== serialize(meta, currValue)) {
           changes.push(`${meta.key}: ${serialize(meta, prevValue)} → ${serialize(meta, currValue)}`);
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
      const value = this[meta.key];
      const defaultValue = defaults[meta.key];

      if (serialize(meta, value) !== serialize(meta, defaultValue)) {
        params.set(meta.key, serialize(meta, value));
      }
    }

    return params;
  }

  /** Create ConfigData from URL query parameters, merging with defaults */
  static fromQueryParams(searchParams: URLSearchParams): ConfigData {
    const defaults = new ConfigData();
    const partial: any = {};

    for (const meta of PROPERTY_METADATA) {
      
      const paramValue = searchParams.get(meta.key);
      if (paramValue !== null) {
        try {
          partial[meta.key] = meta.deserialize 
            ? meta.deserialize(paramValue) 
            : paramValue;
        } catch (e) {
          console.error(`Error deserializing ${meta.key} value ${paramValue}:`, e);
        }
      }
    }

    return new ConfigData({ ...defaults, ...partial });
  }
}

function serialize(meta: PropertyMetadata, value: any) {
  if (value === undefined) return "undefined";
   return meta.serialize ? meta.serialize(value) : String(value);
}

// Constraints on valid values, used by the UI
export const CONSTRAINTS = {
  numberOfNotes: { min: 1, max: 10 },
  playExtraNotes: { min: 0, max: 5 },
  tempo: { min: 40, max: 400, step: 10 },
  consecutiveIntervals: { min: 0, max: 12+12 },
  questionNoteRange: { min: -12, max: 24 }, // -1 octave to +2 octaves
  intervalToFind: { min: 1, max: 12 }, // 1 semitone (minor 2nd) to 12 semitones (octave)
  intervalComparisonRange: { min: 1, max: 12 },
} as const;

