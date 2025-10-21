// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

import { MidiNoteName, SemitoneOffset } from "@/utils/audio";

export class ConfigData {
  selectedNotes: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11]; // Full major scale - MIDI intervals relative to root (0-11)
  numberOfNotes: number = 3; // Number of notes per question (2-10)
  playExtraNotes: number = 0; // Extra random notes to play at end (0-5)
  minInterval: SemitoneOffset = 1;
  maxInterval: SemitoneOffset = 12; // default - go up to an octave 
  tempo: number = 200; 
  rhythm: "fixed" | "random" = "fixed";
  droneType: "none" | "root" = "none";
  referenceType: "root" | "arpeggio" = "root";
  rootNotePitch: MidiNoteName = "C4"; // e.g., "C4"
  instrument: string = "acoustic_grand_piano"; // Instrument slug

  /** Get a general name for exercises "like this one" that will be displayed to users, and used to group historic results */
  getExerciseName(): string {
    if (this.numberOfNotes === 1) return "Single note recognition";
    return "Melody recognition"
  }

  constructor(partial?: Partial<ConfigData>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
  
}

// Constraints on valid values, used by the UI
export const CONSTRAINTS = {
  numberOfNotes: { min: 1, max: 10 },
  playExtraNotes: { min: 0, max: 5 },
  tempo: { min: 40, max: 300, step: 5 },
  interval: { min: 1, max: 11 },
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

