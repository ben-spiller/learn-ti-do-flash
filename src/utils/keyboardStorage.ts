import { MidiNoteName } from "@/utils/audio";

export interface KeyboardSettings {
  rootNote: MidiNoteName;
  instrument: string;
  droneEnabled: boolean;
  droneVolume: number;
  volume: number;
}

const KEYBOARD_SETTINGS_KEY = "solfege-keyboard-settings";

const DEFAULT_SETTINGS: KeyboardSettings = {
  rootNote: "C4",
  instrument: "acoustic_grand_piano",
  droneEnabled: false,
  droneVolume: -8,
  volume: -8,
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
