// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

import { MidiNoteName, SemitoneOffset } from "@/utils/audio";

export class ConfigData {
  selectedNotes: SemitoneOffset[] = [0, 2, 4, 5, 7, 9, 11]; // Full major scale - MIDI intervals relative to root (0-11)
  numberOfNotes: number = 3; // Number of notes per question (2-10)
  minInterval: number = 1; // Minimum interval between consecutive notes (1-7)
  maxInterval: number = 7; // Maximum interval between consecutive notes (1-7)
  tempo: number = 120; // BPM (40-200)
  rhythm: "fixed" | "random" = "fixed";
  referencePlay: "once" | "drone" = "once";
  referenceType: "root" | "arpeggio" = "root";
  rootNotePitch: MidiNoteName = "C4"; // e.g., "C4"
  instrument: string = "acoustic_grand_piano"; // Instrument slug

  constructor(partial?: Partial<ConfigData>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

// Instrument options
export const INSTRUMENT_OPTIONS = [
  { slug: "acoustic_grand_piano", label: "Grand Piano" },
  { slug: "electric_piano", label: "Electric Piano" },
  { slug: "violin", label: "Violin" },
  { slug: "saxophone", label: "Saxophone" },
];

// Constraints on valid values
export const CONSTRAINTS = {
  numberOfNotes: { min: 1, max: 10 },
  tempo: { min: 40, max: 300, step: 5 },
  interval: { min: 1, max: 7 },
} as const;
