import { DEFAULT_FAVOURITE_INSTRUMENTS } from "./audio";

const FAVOURITE_INSTRUMENTS_KEY = "favourite-instruments";

export const getFavouriteInstruments = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVOURITE_INSTRUMENTS_KEY);
    if (!stored) return [...DEFAULT_FAVOURITE_INSTRUMENTS];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading favourite instruments:", error);
    return [...DEFAULT_FAVOURITE_INSTRUMENTS];
  }
};

export const saveFavouriteInstruments = (favourites: string[]): void => {
  localStorage.setItem(FAVOURITE_INSTRUMENTS_KEY, JSON.stringify(favourites));
};
