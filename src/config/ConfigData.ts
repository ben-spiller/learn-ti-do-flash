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

// Instrument options
export const INSTRUMENT_OPTIONS = [
  { slug: "acoustic_grand_piano", label: "Grand Piano" },
  { slug: "electric_piano", label: "Electric Piano" },
  { slug: "violin", label: "Violin" },
  { slug: "saxophone", label: "Saxophone" },
];

