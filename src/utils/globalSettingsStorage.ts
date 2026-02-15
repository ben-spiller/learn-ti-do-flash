import { DEFAULT_FAVOURITE_INSTRUMENTS } from "./audio";

export type ReferenceType = "none" | "root" | "arpeggio";

interface GlobalSettings {
  referenceType: ReferenceType;
  instrumentMode: "single" | "random";
  selectedInstrument: string;
  favouriteInstruments: string[];
}

const GLOBAL_SETTINGS_KEY = "global-settings";

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  referenceType: "root",
  instrumentMode: "random",
  selectedInstrument: "acoustic_grand_piano",
  favouriteInstruments: [...DEFAULT_FAVOURITE_INSTRUMENTS],
};

export const getGlobalSettings = (): GlobalSettings => {
  try {
    const stored = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate: if no instrument settings yet, check legacy storage
      if (!parsed.favouriteInstruments) {
        const legacyFavs = localStorage.getItem("favourite-instruments");
        if (legacyFavs) {
          parsed.favouriteInstruments = JSON.parse(legacyFavs);
        }
      }
      return { ...DEFAULT_GLOBAL_SETTINGS, ...parsed };
    }
    // Check legacy favourite instruments storage for migration
    const legacyFavs = localStorage.getItem("favourite-instruments");
    if (legacyFavs) {
      return { ...DEFAULT_GLOBAL_SETTINGS, favouriteInstruments: JSON.parse(legacyFavs) };
    }
    return DEFAULT_GLOBAL_SETTINGS;
  } catch (error) {
    console.error("Error loading global settings:", error);
    return DEFAULT_GLOBAL_SETTINGS;
  }
};

export const saveGlobalSettings = (settings: Partial<GlobalSettings>): void => {
  try {
    const current = getGlobalSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error("Error saving global settings:", error);
  }
};
