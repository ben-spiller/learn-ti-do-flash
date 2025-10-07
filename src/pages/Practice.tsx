import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Volume2, X } from "lucide-react";
import { playNote, playSequence, generateRandomSequence } from "@/utils/audio";
import { toast } from "@/hooks/use-toast";

const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];
const ALL_NOTES_DISPLAY = ["Ti", "La", "Sol", "Fa", "Mi", "Re", "Do"];

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedNotes, numberOfNotes } = location.state || {
    selectedNotes: ["Do", "Re", "Mi"],
    numberOfNotes: 5,
  };

  const [sequence, setSequence] = useState<string[]>([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    const newSequence = generateRandomSequence(selectedNotes, numberOfNotes);
    setSequence(newSequence);
    setCurrentPosition(0);
    playSequenceWithDelay(newSequence);
  };

  const playSequenceWithDelay = async (seq: string[]) => {
    setIsPlaying(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await playSequence(seq);
    setIsPlaying(false);
  };

  const handleNotePress = (note: string) => {
    playNote(note, 0.3);
    
    if (currentPosition >= numberOfNotes) return;
    
    const correctNote = sequence[currentPosition];
    if (note === correctNote) {
      setCurrentPosition(currentPosition + 1);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
    }
  };

  const handlePlayAgain = () => {
    playSequenceWithDelay(sequence);
  };

  const handlePlayReference = () => {
    playSequenceWithDelay(selectedNotes);
  };

  const handleFinish = () => {
    navigate("/");
  };

  const getNoteButtonColor = (note: string) => {
    const colorMap: Record<string, string> = {
      "Do": "bg-solfege-do hover:bg-solfege-do/90",
      "Re": "bg-solfege-re hover:bg-solfege-re/90",
      "Mi": "bg-solfege-mi hover:bg-solfege-mi/90",
      "Fa": "bg-solfege-fa hover:bg-solfege-fa/90",
      "Sol": "bg-solfege-sol hover:bg-solfege-sol/90",
      "La": "bg-solfege-la hover:bg-solfege-la/90",
      "Ti": "bg-solfege-ti hover:bg-solfege-ti/90",
    };
    return colorMap[note] || "bg-muted hover:bg-muted/80";
  };

  const isNoteEnabled = (note: string) => {
    return selectedNotes.includes(note);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={handleFinish}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold ml-2">Practice</h1>
      </div>

      <div className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Solfege buttons at the top */}
        <div className="grid gap-3">
          {ALL_NOTES_DISPLAY.map((note) => (
            <Button
              key={note}
              onClick={() => handleNotePress(note)}
              className={`h-16 text-xl font-bold text-white ${getNoteButtonColor(note)}`}
              disabled={isPlaying || currentPosition >= numberOfNotes || !isNoteEnabled(note)}
            >
              {note}
            </Button>
          ))}
        </div>

        {/* Progress card */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="text-center">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center flex-wrap">
              {Array.from({ length: numberOfNotes }).map((_, index) => (
                <div
                  key={index}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                    index < currentPosition
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentPosition ? sequence[index] : "?"}
                </div>
              ))}
            </div>
            {currentPosition === numberOfNotes && (
              <div className="mt-4 text-center">
                <p className="text-lg font-semibold text-success">Complete! 🎉</p>
              </div>
            )}
          </CardContent>
          
          {/* Error flash overlay */}
          {showError && (
            <div className="absolute inset-0 bg-destructive/20 rounded-lg flex items-center justify-center animate-pulse">
              <X className="w-20 h-20 text-destructive" strokeWidth={3} />
            </div>
          )}
        </Card>

        {/* Control buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={handlePlayAgain}
            disabled={isPlaying}
            className="h-14"
          >
            <Play className="h-5 w-5 mr-2" />
            Play Again
          </Button>
          <Button
            variant="outline"
            onClick={handlePlayReference}
            disabled={isPlaying}
            className="h-14"
          >
            <Volume2 className="h-5 w-5 mr-2" />
            Reference
          </Button>
          <Button
            onClick={handleFinish}
            variant="secondary"
            className="h-14"
          >
            Finish
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Practice;
