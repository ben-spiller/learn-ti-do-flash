const FAVOURITE_INSTRUMENTS_KEY = "favourite-instruments";

const DEFAULT_FAVOURITES = ["acoustic_grand_piano", "electric_piano_1", "violin"];

export const getFavouriteInstruments = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVOURITE_INSTRUMENTS_KEY);
    if (!stored) return DEFAULT_FAVOURITES;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading favourite instruments:", error);
    return DEFAULT_FAVOURITES;
  }
};

export const saveFavouriteInstruments = (favourites: string[]): void => {
  localStorage.setItem(FAVOURITE_INSTRUMENTS_KEY, JSON.stringify(favourites));
};
