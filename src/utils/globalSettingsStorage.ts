export type ReferenceType = "none" | "root" | "arpeggio";

interface GlobalSettings {
  referenceType: ReferenceType;
}

const GLOBAL_SETTINGS_KEY = "global-settings";

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  referenceType: "root",
};

export const getGlobalSettings = (): GlobalSettings => {
  try {
    const stored = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_GLOBAL_SETTINGS;
  } catch (error) {
    console.error("Error loading global settings:", error);
    return DEFAULT_GLOBAL_SETTINGS;
  }
};

export const saveGlobalSettings = (settings: GlobalSettings): void => {
  try {
    localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving global settings:", error);
  }
};
