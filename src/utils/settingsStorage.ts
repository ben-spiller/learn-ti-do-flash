import { SettingsData } from "@/config/practiceSettings";

export interface SavedConfiguration {
  id: string;
  name: string;
  settings: SettingsData;
  createdAt: string;
}

const STORAGE_KEY = "saved-practice-configurations";

export const getSavedConfigurations = (): SavedConfiguration[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading saved configurations:", error);
    return [];
  }
};

export const saveConfiguration = (name: string, settings: SettingsData): SavedConfiguration => {
  const configurations = getSavedConfigurations();
  
  const newConfig: SavedConfiguration = {
    id: crypto.randomUUID(),
    name,
    settings: new SettingsData(settings), // Ensure it's a proper SettingsData instance
    createdAt: new Date().toISOString(),
  };
  
  configurations.push(newConfig);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configurations));
  
  return newConfig;
};

export const deleteConfiguration = (id: string): void => {
  const configurations = getSavedConfigurations();
  const filtered = configurations.filter(config => config.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const loadConfiguration = (id: string): SettingsData | null => {
  const configurations = getSavedConfigurations();
  const config = configurations.find(c => c.id === id);
  if (!config) return null;
  
  return new SettingsData(config.settings);
};
