// Practice Settings Configuration
// Central location for all practice-related settings, defaults, and constants

export class PracticeSettings {
  selectedNotes: number[] = [0, 2, 4, 5, 7, 9, 11]; // Full major scale - MIDI intervals relative to root (0-11)
  numberOfNotes: number = 3; // Number of notes per question (2-10)
  minInterval: number = 1; // Minimum interval between consecutive notes (1-7)
  maxInterval: number = 7; // Maximum interval between consecutive notes (1-7)
  tempo: number = 120; // BPM (40-200)
  rhythm: "fixed" | "random" = "fixed";
  referencePlay: "once" | "drone" = "once";
  referenceType: "root" | "arpeggio" = "root";
  rootNotePitch: string = "C4"; // e.g., "C4"
  instrument: string = "acoustic_grand_piano"; // Instrument slug
  preloaded?: boolean = false; // Whether audio has been preloaded

  constructor(partial?: Partial<PracticeSettings>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

// Solfege mappings
export const SOLFEGE_TO_INTERVAL: Record<string, number> = {
  "Do": 0,
  "Re": 2,
  "Mi": 4,
  "Fa": 5,
  "Sol": 7,
  "La": 9,
  "Ti": 11,
};

export const INTERVAL_TO_SOLFEGE: Record<number, string> = {
  0: "Do",
  2: "Re",
  4: "Mi",
  5: "Fa",
  7: "Sol",
  9: "La",
  11: "Ti",
};

export const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

// Instrument options
export const INSTRUMENT_OPTIONS = [
  { slug: "acoustic_grand_piano", label: "Grand Piano" },
  { slug: "electric_piano", label: "Electric Piano" },
  { slug: "violin", label: "Violin" },
  { slug: "saxophone", label: "Saxophone" },
];

// Root note pitch options
export const ROOT_NOTE_OPTIONS = [
  "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
];

// Constraints
export const CONSTRAINTS = {
  numberOfNotes: { min: 2, max: 10 },
  tempo: { min: 40, max: 200, step: 5 },
  interval: { min: 1, max: 7 },
} as const;
