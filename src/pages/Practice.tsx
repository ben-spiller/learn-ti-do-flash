import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Volume2 } from "lucide-react";
import { playNote, playSequence, generateRandomSequence } from "@/utils/audio";
import { toast } from "@/hooks/use-toast";

const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedNotes, numberOfNotes } = location.state || {
    selectedNotes: ["Do", "Re", "Mi"],
    numberOfNotes: 5,
  };

  const [sequence, setSequence] = useState<string[]>([]);
  const [userInput, setUserInput] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    const newSequence = generateRandomSequence(selectedNotes, numberOfNotes);
    setSequence(newSequence);
    setUserInput([]);
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
    if (userInput.length < numberOfNotes) {
      setUserInput([...userInput, note]);
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

  const getNoteColor = (note: string, index: number) => {
    if (index >= userInput.length) return "bg-muted hover:bg-muted/80";
    
    const correctNote = sequence[index];
    if (userInput[index] === correctNote) {
      return "bg-success hover:bg-success/90";
    }
    return "bg-destructive hover:bg-destructive/90";
  };

  const getButtonColor = (note: string) => {
    const noteIndex = SOLFEGE_NOTES.indexOf(note);
    if (noteIndex < 2) return "bg-success hover:bg-success/90";
    if (noteIndex < 5) return "bg-warning hover:bg-warning/90";
    return "bg-destructive hover:bg-destructive/90";
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
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center flex-wrap">
              {Array.from({ length: numberOfNotes }).map((_, index) => (
                <div
                  key={index}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm transition-colors ${getNoteColor(
                    sequence[index],
                    index
                  )}`}
                >
                  {index < userInput.length ? userInput[index] : "?"}
                </div>
              ))}
            </div>
            {userInput.length === numberOfNotes && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">Correct answer:</p>
                <p className="text-lg font-semibold">{sequence.join(" - ")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {SOLFEGE_NOTES.map((note) => {
            if (!selectedNotes.includes(note)) return null;
            return (
              <Button
                key={note}
                onClick={() => handleNotePress(note)}
                className={`h-16 text-xl font-bold text-white ${getButtonColor(note)}`}
                disabled={isPlaying || userInput.length >= numberOfNotes}
              >
                {note}
              </Button>
            );
          })}
        </div>

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
