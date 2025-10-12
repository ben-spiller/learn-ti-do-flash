import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Volume2, X, VolumeX, Volume1 } from "lucide-react";
import { playNote, playSequence, generateRandomSequence, midiToSolfege, solfegeToMidi, midiToNoteName, noteNameToMidi, preloadInstrumentWithGesture, MAJOR_SCALE_PITCH_CLASSES, startDrone, stopDrone, setDroneVolume } from "@/utils/audio";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    selectedNotes?: string[];
    numberOfNotes?: number;
    doNote?: string;
    referencePlay?: "once" | "drone";
    referenceType?: "root" | "arpeggio";
    rootNotePitch?: string;
    preloaded?: boolean;
  } | null;
  
  const {
    selectedNotes = ["Do", "Re", "Mi", "Fa"], // TODO: use pitch class numbers instead
    numberOfNotes = 4,
    doNote = "C4",
    referencePlay = "once",
    referenceType = "root",
    rootNotePitch = "C4",
    preloaded = false,
  } = state || {};

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
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [started, setStarted] = useState(preloaded);
  const [hasPreloaded, setHasPreloaded] = useState(preloaded);
  const [droneVolume, setDroneVolumeState] = useState(-26); // default volume in dB

  // Shared spacing constants used by both the solfege column and the chromatic column.
  // Units: rem for the layout math, and Tailwind margin classes for the button stack.
  const WIDE_GAP_REM = 1.0; // rem - used for both solfege stack spacing and chromatic math
  const NARROW_GAP_REM = 0.2; // rem - used for smaller spacing
  
  // Auto-start if coming from Settings with preloaded samples
  useEffect(() => {
    if (started && preloaded) {
      const playReferenceAndStart = async () => {
        if (referencePlay === "once") {
          if (referenceType === "arpeggio") {
            // Play do-mi-sol-do-sol-mi-do arpeggio
            const doMidi = noteNameToMidi(rootNotePitch);
            const arpeggio = [
              doMidi,           // do
              doMidi + 4,       // mi
              doMidi + 7,       // sol
              doMidi + 12,      // do (octave up)
              doMidi + 7,       // sol
              doMidi + 4,       // mi
              doMidi,           // do
            ];
            await playSequenceWithDelay(arpeggio);
          } else {
            // Play reference note once before first question
            await playSequenceWithDelay([noteNameToMidi(rootNotePitch)]);
          }
        } else if (referencePlay === "drone") {
          // Start drone if configured
          startDrone(rootNotePitch);
        }
        
        // Now start the first round
        startNewRound();
      };
      
      playReferenceAndStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup drone on unmount
  useEffect(() => {
    return () => {
      stopDrone();
    };
  }, []);

  const handleStart = async () => {
    if (started) return;
    
    setIsPreloading(true);
    
    // Show loading indicator only if preload takes more than 400ms
    const loadingTimer = setTimeout(() => {
      setShowLoadingIndicator(true);
    }, 400);
    
    const ok = await preloadInstrumentWithGesture();
    
    clearTimeout(loadingTimer);
    setShowLoadingIndicator(false);
    setIsPreloading(false);
    
    if (ok) {
      setHasPreloaded(true);
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
    playSequenceWithDelay(newSequence as number[]);
  };

  const playSequenceWithDelay = async (seq: number[]) => {
    setIsPlaying(true);
    await playSequence(seq, 0.1, 0.7);
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
    playSequenceWithDelay(sequence);
  };

  const handlePlayReference = () => {
    if (referenceType === "arpeggio") {
      const doMidi = noteNameToMidi(rootNotePitch);
      const arpeggio = [
        doMidi,           // do
        doMidi + 4,       // mi
        doMidi + 7,       // sol
        doMidi + 12,      // do (octave up)
        doMidi + 7,       // sol
        doMidi + 4,       // mi
        doMidi,           // do
      ];
      playSequenceWithDelay(arpeggio);
    } else {
      playSequenceWithDelay([noteNameToMidi(rootNotePitch)]);
    }
  };

  const handleFinish = () => {
    navigate("/");
  };

  const handleDroneVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setDroneVolumeState(newVolume);
    setDroneVolume(newVolume);
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
        <div className="flex gap-4 items-center">
          {referencePlay === "drone" && started && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  {droneVolume <= -40 ? <VolumeX className="h-5 w-5" /> : 
                   droneVolume <= -20 ? <Volume1 className="h-5 w-5" /> : 
                   <Volume2 className="h-5 w-5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Drone Volume</div>
                  <Slider
                    value={[droneVolume]}
                    onValueChange={handleDroneVolumeChange}
                    min={-50}
                    max={-10}
                    step={2}
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {droneVolume} dB
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
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
      </div>

      <div className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
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
                      {solfege} ({7-index})
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
                      # / b
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
            <Button 
              onClick={handleStart} 
              className="w-40 h-14 text-lg"
              disabled={isPreloading}
            >
              {showLoadingIndicator ? "Loading sounds..." : "Start"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;
