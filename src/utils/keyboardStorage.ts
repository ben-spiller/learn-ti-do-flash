import { MidiNoteName } from "@/utils/audio";

export interface KeyboardSettings {
  rootNote: MidiNoteName;
  notesInstrument: string;
  notesVolume: number;
  chordsInstrument: string;
  chordsVolume: number;
  droneEnabled: boolean;
  droneVolume: number;
}

const KEYBOARD_SETTINGS_KEY = "solfege-keyboard-settings";

const DEFAULT_SETTINGS: KeyboardSettings = {
  rootNote: "C4",
  notesInstrument: "acoustic_grand_piano",
  notesVolume: -8,
  chordsInstrument: "acoustic_grand_piano",
  chordsVolume: -8,
  droneEnabled: false,
  droneVolume: -8,
};

export const getKeyboardSettings = (): KeyboardSettings => {
  try {
    const stored = localStorage.getItem(KEYBOARD_SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (error) {
    console.error("Error loading keyboard settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveKeyboardSettings = (settings: KeyboardSettings): void => {
  try {
    localStorage.setItem(KEYBOARD_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving keyboard settings:", error);
  }
};
