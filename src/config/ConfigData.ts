// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

import { MidiNoteName, SemitoneOffset } from "@/utils/audio";

export class ConfigData {
  selectedNotes: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11]; // Full major scale - MIDI intervals relative to root (0-11)
  numberOfNotes: number = 3; // Number of notes per question (2-10)
  playExtraNotes: number = 0; // Extra random notes to play at end (0-5)
  consecutiveIntervals: [SemitoneOffset, SemitoneOffset] = [1, 11]; // default - go up to an octave
  questionNoteRange: [SemitoneOffset, SemitoneOffset] = [0, 12]; // Range for question notes: -12 (Do -1 octave) to +24 (Do +2 octaves)
  tempo: number = 200; 
  rhythm: "fixed" | "random" = "fixed";
  droneType: "none" | "root" = "none";
  referenceType: "root" | "arpeggio" = "root";
  rootNotePitch: MidiNoteName = "C4"; // e.g., "C4"
  instrument: string = "acoustic_grand_piano"; // Instrument slug (used when instrumentMode is "single")
  instrumentMode: "single" | "random" = "single"; // Whether to use a single instrument or random from favourites
  favouriteInstruments: string[] = ["acoustic_grand_piano", "electric_piano_1", "violin"]; // Favourite instruments for random selection

  /** Get a general name for exercises "like this one" that will be displayed to users, and used to group historic results */
  getExerciseName(): string {
    if (this.numberOfNotes === 1) return "Single note recognition";
    return "Melody recognition"
  }

  /** Pick the instrument to use for this session based on the instrument mode */
  pickInstrument(): string {
    if (this.instrumentMode === "random" && this.favouriteInstruments.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.favouriteInstruments.length);
      return this.favouriteInstruments[randomIndex];
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
      other.instrumentMode === this.instrumentMode &&
      JSON.stringify(other.favouriteInstruments.sort()) === JSON.stringify(this.favouriteInstruments.sort())
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
      if (current.consecutiveIntervals !== previous.consecutiveIntervals) {
        changes.push(`Interval: ${previous.consecutiveIntervals[0]}-${previous.consecutiveIntervals[1]} → ${current.consecutiveIntervals[0]}-${current.consecutiveIntervals[1]}`);
      }
      if (current.rhythm !== previous.rhythm) {
        changes.push(`Rhythm: ${previous.rhythm} → ${current.rhythm}`);
      }
      if (current.droneType !== previous.droneType) {
        changes.push(`Drone: ${previous.droneType} → ${current.droneType}`);
      }
      if (current.referenceType !== previous.referenceType) {
        changes.push(`Reference: ${previous.referenceType} → ${current.referenceType}`);
      }
      if (current.rootNotePitch !== previous.rootNotePitch) {
        changes.push(`Root: ${previous.rootNotePitch} → ${current.rootNotePitch}`);
      }
      if (current.instrument !== previous.instrument) {
        changes.push(`Instrument: ${previous.instrument} → ${current.instrument}`);
      }
      if (current.playExtraNotes !== previous.playExtraNotes) {
        changes.push(`Extra notes: ${previous.playExtraNotes} → ${current.playExtraNotes}`);
      }
      if (JSON.stringify(current.selectedNotes.sort()) !== JSON.stringify(previous.selectedNotes.sort())) {
        changes.push(`Selected notes: [${previous.selectedNotes.join(", ")}] -> [${current.selectedNotes.join(", ")}]`);
      }
      
      return changes;
    } catch (e) {
      console.error("Error computing settings changes:", e);
      return ["Configuration options changed due to new app version"];
    }
  };

  
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

