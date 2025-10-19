// Shared styling utilities for note and score display

export const SOLFEGE_COLOR_CLASSES: Record<string, string> = {
  do: "bg-solfege-do hover:bg-solfege-do/90",
  re: "bg-solfege-re hover:bg-solfege-re/90",
  mi: "bg-solfege-mi hover:bg-solfege-mi/90",
  fa: "bg-solfege-fa hover:bg-solfege-fa/90",
  sol: "bg-solfege-sol hover:bg-solfege-sol/90",
  la: "bg-solfege-la hover:bg-solfege-la/90",
  ti: "bg-solfege-ti hover:bg-solfege-ti/90",
  semitone: "bg-solfege-semitone hover:bg-solfege-semitone/90",
};

export const getNoteButtonColor = (note: string): string => {
  const n = (note || "").toLowerCase();
  return SOLFEGE_COLOR_CLASSES[n] ?? "bg-muted hover:bg-muted/90";
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-amber-600";
  return "text-destructive";
};
