import { ConfigData, ExerciseType } from "@/config/ConfigData";

export interface SavedConfiguration {
  id: string;
  name: string;
  settings: ConfigData;
  createdAt: string;
}

const STORAGE_KEY = "saved-practice-configurations";
const CURRENT_CONFIG_KEY_PREFIX = "current-practice-configuration";

export const getSavedConfigurations = (): SavedConfiguration[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const configs = JSON.parse(stored);
    // Sort by name alphabetically
    return configs.sort((a: SavedConfiguration, b: SavedConfiguration) => 
      a.name.localeCompare(b.name)
    );
  } catch (error) {
    console.error("Error loading saved configurations:", error);
    return [];
  }
};

export const saveConfiguration = (name: string, settings: ConfigData): SavedConfiguration => {
  const configurations = getSavedConfigurations();
  
  // Check if a configuration with this name already exists
  const existingIndex = configurations.findIndex(c => c.name === name);
  
  if (existingIndex !== -1) {
    // Update existing configuration
    configurations[existingIndex] = {
      ...configurations[existingIndex],
      settings: new ConfigData(settings),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configurations));
    return configurations[existingIndex];
  } else {
    // Create new configuration
    const newConfig: SavedConfiguration = {
      id: crypto.randomUUID(),
      name,
      settings: new ConfigData(settings),
      createdAt: new Date().toISOString(),
    };
    
    configurations.push(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configurations));
    return newConfig;
  }
};

export const deleteConfiguration = (id: string): void => {
  const configurations = getSavedConfigurations();
  const filtered = configurations.filter(config => config.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const loadConfiguration = (id: string): ConfigData | null => {
  const configurations = getSavedConfigurations();
  const config = configurations.find(c => c.id === id);
  if (!config) return null;
  
  return new ConfigData(config.settings);
};

export const saveCurrentConfiguration = (settings: ConfigData): void => {
  const key = `${CURRENT_CONFIG_KEY_PREFIX}-${settings.exerciseType}`;
  localStorage.setItem(key, JSON.stringify(settings));
};

export const getCurrentConfiguration = (exerciseType: ExerciseType): ConfigData | null => {
  try {
    const key = `${CURRENT_CONFIG_KEY_PREFIX}-${exerciseType}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return new ConfigData(JSON.parse(stored));
  } catch (error) {
    console.error("Error loading current configuration:", error);
    return null;
  }
};
