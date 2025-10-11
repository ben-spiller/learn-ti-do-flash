import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Volume2, X } from "lucide-react";
import { playNote, playSequence, generateRandomSequence, midiToSolfege, solfegeToMidi, midiToNoteName, noteNameToMidi, preloadInstrumentWithGesture, MAJOR_SCALE_PITCH_CLASSES, startDrone, stopDrone } from "@/utils/audio";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    selectedNotes = ["Do", "Re", "Mi", "Fa"], // TODO: use pitch class numbers instead
    numberOfNotes = 4,
    doNote = "C4",
    referencePlay = "once",
    rootNotePitch = "C4",
  } = (location.state || {});

  // Normalize incoming selected notes (likely solfege strings) into MIDI numbers
  const initialMidiNotes: number[] = Array.isArray(selectedNotes)
    ? (selectedNotes as string[]).map(s => {
        const m = solfegeToMidi(s, doNote);
        return m != null ? m : (typeof s === 'string' ? (noteNameToMidi(s) as number) : (s as unknown as number));
      })
    : [];

  const [sequence, setSequence] = useState<number[]>([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showError, setShowError] = useState(false);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<{ decoded: number; total: number } | null>(null);
  const [started, setStarted] = useState(false);

  // Shared spacing constants used by both the solfege column and the chromatic column.
  // Units: rem for the layout math, and Tailwind margin classes for the button stack.
  const WIDE_GAP_REM = 1.0; // rem - used for both solfege stack spacing and chromatic math
  const NARROW_GAP_REM = 0.2; // rem - used for smaller spacing
  
  // don't auto-start; wait for explicit Start button so the initial action can be
  // a user gesture that enables audio autoplay permissions.
  useEffect(() => {
    if (started) {
      startNewRound();
      // Start drone if configured
      if (referencePlay === "drone") {
        startDrone(rootNotePitch || doNote);
      }
    }
  }, [started]);

  // Cleanup drone on unmount
  useEffect(() => {
    return () => {
      stopDrone();
    };
  }, []);

  const handleStart = async () => {
    if (started) return;
    setIsPreloading(true);
    const ok = await preloadInstrumentWithGesture(undefined, undefined, (decoded, total) => {
      setPreloadProgress({ decoded, total });
    });
    setIsPreloading(false);
    // small delay so the user can see completion
    setTimeout(() => setPreloadProgress(null), 400);
    if (ok) {
      setStarted(true);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setElapsedMinutes(elapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'n' && currentPosition === numberOfNotes) {
        startNewRound();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPosition, numberOfNotes]);

  const startNewRound = () => {
    const pool = initialMidiNotes;
    const newSequence = generateRandomSequence(pool, numberOfNotes);
    setSequence(newSequence as number[]);
    setCurrentPosition(0);
    playSequenceWithDelay(newSequence as number[], false);
  };

  const playSequenceWithDelay = async (seq: number[], allowPreload: boolean = false) => {
    setIsPlaying(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    // ensure instrument preloaded on first play (only when allowed)
    if (allowPreload && !isPreloading && !preloadProgress) {
      setIsPreloading(true);
      const ok = await preloadInstrumentWithGesture(undefined, undefined, (decoded, total) => {
        setPreloadProgress({ decoded, total });
      });
      setIsPreloading(false);
      if (!ok) {
        // user declined or preload failed; allow still trying to play which may prompt again
      }
      // clear progress after a short delay
      setTimeout(() => setPreloadProgress(null), 400);
    }
    await playSequence(seq);
    setIsPlaying(false);
  };

  const handleNotePress = (scaleNote: number) => {
    playNote(scaleNote);

    if (currentPosition >= numberOfNotes) return;

    const correctNote = sequence[currentPosition];
    setTotalAttempts(totalAttempts + 1);

    if (scaleNote === correctNote) {
      setCorrectAttempts(correctAttempts + 1);
      setCurrentPosition(currentPosition + 1);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
    }
  };

  const handlePlayAgain = () => {
    playSequenceWithDelay(sequence, true);
  };

  const handlePlayReference = () => {
    playSequenceWithDelay([noteNameToMidi(doNote)], true);
  };

  const handleFinish = () => {
    navigate("/");
  };


  // nb: have to do this mapping because Tailwind strips out dynamic class names
  const SOLFEGE_COLOR_CLASSES: Record<string, string> = {
    do: "bg-solfege-do hover:bg-solfege-do/90",
    re: "bg-solfege-re hover:bg-solfege-re/90",
    mi: "bg-solfege-mi hover:bg-solfege-mi/90",
    fa: "bg-solfege-fa hover:bg-solfege-fa/90",
    sol: "bg-solfege-sol hover:bg-solfege-sol/90",
    la: "bg-solfege-la hover:bg-solfege-la/90",
    ti: "bg-solfege-ti hover:bg-solfege-ti/90",
    semitone: "bg-solfege-semitone hover:bg-solfege-semitone/90",
    };

  const getNoteButtonColor = (note: string) => {
    const n = (note || "").toLowerCase();
    return SOLFEGE_COLOR_CLASSES[n] ?? "bg-muted hover:bg-muted/90";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleFinish}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">Practice</h1>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg">{totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100}%</div>
            <div className="text-muted-foreground">Score</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{elapsedMinutes}</div>
            <div className="text-muted-foreground">Min</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Preload progress indicator */}
        {(isPreloading || preloadProgress) && (
          <div className="w-full max-w-md mx-auto p-2">
            <div className="text-sm mb-2 text-center">Loading audio samples...</div>
            <Progress value={preloadProgress ? Math.round((preloadProgress.decoded / preloadProgress.total) * 100) : 0} />
            {preloadProgress && (
              <div className="text-xs text-muted-foreground mt-1 text-center">{preloadProgress.decoded}/{preloadProgress.total}</div>
            )}
          </div>
        )}
        {started ? (
          <>
            {/* Solfege buttons at the top */}
            <div className="flex gap-2">
              {/* Main solfege notes column */}
              <div className="flex-1 flex flex-col">
                {[...MAJOR_SCALE_PITCH_CLASSES].reverse().map((pitch, index) => {
                  let solfege = midiToSolfege(pitch);
                  if (!solfege) { solfege = "?"+pitch.toString(); }
                  
                  // Calculate gap - wider except between Mi-Fa (natural semitone)
                  const nextPitch = [...MAJOR_SCALE_PITCH_CLASSES].reverse()[index + 1];
                  const hasChromatic = nextPitch !== undefined && Math.abs(pitch - nextPitch) === 2;
                  // use rem-based inline margin so units match the chromatic column math
                  const gapStyle = { marginBottom: `${hasChromatic ? WIDE_GAP_REM : NARROW_GAP_REM}rem` } as React.CSSProperties;
                  
                  return (
                    <Button
                      key={pitch}
                      onClick={() => handleNotePress(pitch+noteNameToMidi(doNote))}
                      className={`h-16 text-xl font-bold text-white ${getNoteButtonColor(solfege)}`}
                      style={index < MAJOR_SCALE_PITCH_CLASSES.length - 1 ? gapStyle : undefined}
                      disabled={isPlaying || currentPosition >= numberOfNotes}
                    >
                      {solfege}
                    </Button>
                  );
                })}
              </div>
              
              {/* Chromatic notes column */}
              <div className="w-24 relative">
                {/* Chromatic notes positioned in gaps */}
                {[10, 8, 6, 3, 1].map((pitch, index) => {
                  // Calculate vertical position to center flat button in the gap
                  const gapPositions = [0, 1, 2, 4, 5]; // Which gap after button index
                  const gapIndex = gapPositions[index];
                  
                  const buttonHeight = 4; // rem (h-16)
                  const flatButtonHeight = 3; // rem (h-12)
                  const wideGap = WIDE_GAP_REM; // rem
                  const narrowGap = NARROW_GAP_REM; // rem
                  
                  // Calculate top position: sum of buttons and gaps before, plus half current gap, minus half flat button
                  let top = 0;
                  for (let i = 0; i < gapIndex; i++) {
                    top += buttonHeight + (i === 3 ? narrowGap : wideGap);
                  }
                  top += buttonHeight + (wideGap / 2) - (flatButtonHeight / 2);
                  
                  let solfege = midiToSolfege(pitch);
                  if (!solfege) { solfege = "?"+pitch.toString(); }
                  
                  return (
                    <Button
                      key={pitch}
                      onClick={() => handleNotePress(pitch+noteNameToMidi(doNote))}
                      className={`absolute h-12 w-full text-lg font-bold text-white ${getNoteButtonColor("semitone")}`}
                      style={{ top: `${top}rem` }}
                      disabled={isPlaying || currentPosition >= numberOfNotes}
                    >
                      {solfege}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Progress card */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-center">Identify the notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-center flex-wrap">
                  {Array.from({ length: numberOfNotes }).map((_, index) => (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                        index < currentPosition
                          ? "bg-success text-black"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index < currentPosition ? (midiToSolfege(sequence[index]) || midiToNoteName(sequence[index])) : "?"}
                    </div>
                  ))}
                </div>
                {currentPosition === numberOfNotes && (
                  <div className="mt-4 text-center space-y-2">
                    <p className="text-lg font-semibold text-success">Complete! 🎉</p>
                    <Button onClick={startNewRound} className="w-full">
                      Next
                    </Button>
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
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-center text-lg">When you're ready, press Start to enable audio and begin.</p>
            <Button onClick={handleStart} className="w-40 h-14 text-lg">
              Start
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;
