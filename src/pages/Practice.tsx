import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Volume2, X, VolumeX, Volume1 } from "lucide-react";
import { playNote, playSequence, midiToSolfege, midiToNoteName, noteNameToMidi, preloadInstrumentWithGesture, MAJOR_SCALE_PITCH_CLASSES, startDrone, stopDrone, setDroneVolume } from "@/utils/audio";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    selectedNotes?: number[]; // MIDI intervals relative to root
    numberOfNotes?: number;
    referencePlay?: "once" | "drone";
    referenceType?: "root" | "arpeggio";
    rootNotePitch?: string;
    tempo?: number;
    preloaded?: boolean;
    minInterval?: number;
    maxInterval?: number;
  } | null;
  
  const {
    selectedNotes = [0, 2, 4, 5], // Default to Do, Re, Mi, Fa (intervals)
    numberOfNotes = 4,
    referencePlay = "once",
    referenceType = "root",
    rootNotePitch = "C4",
    tempo = 120,
    preloaded = false,
    minInterval = 1,
    maxInterval = 7,
  } = state || {};

  // Calculate note duration based on tempo (BPM)
  // At 60 BPM, each beat = 1 second; at 120 BPM, each beat = 0.5 seconds
  const noteDuration = 60 / tempo;
  const noteGap = noteDuration * 0.15; // Gap is 15% of note duration

  console.log('Practice settings:', { tempo, noteDuration, noteGap, rootNotePitch, selectedNotes });

  // Convert intervals to absolute MIDI notes based on rootNotePitch
  const rootMidi = noteNameToMidi(rootNotePitch);
  const initialMidiNotes: number[] = selectedNotes.map(interval => rootMidi + interval);

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
  const [isPlayingReference, setIsPlayingReference] = useState(false);

  // Shared spacing constants used by both the solfege column and the chromatic column.
  // Units: rem for the layout math, and Tailwind margin classes for the button stack.
  const WIDE_GAP_REM = 1.0; // rem - used for both solfege stack spacing and chromatic math
  const NARROW_GAP_REM = 0.2; // rem - used for smaller spacing
  
  // Auto-start if coming from Settings with preloaded samples
  useEffect(() => {
    if (started && preloaded) {
      const playReferenceAndStart = async () => {
        if (referencePlay === "once") {
          setIsPlayingReference(true);
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
            await playSequence(arpeggio, 0.15, 1.0);
          } else {
            // Play reference note longer
            await playSequence([noteNameToMidi(rootNotePitch)], 0, 2.0);
          }
          setIsPlayingReference(false);
          // Add gap before exercise
          await new Promise(resolve => setTimeout(resolve, 800));
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
      
      // Play reference and start first round
      if (referencePlay === "once") {
        setIsPlayingReference(true);
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
          await playSequence(arpeggio, 0.15, 1.0);
        } else {
          await playSequence([noteNameToMidi(rootNotePitch)], 0, 2.0);
        }
        setIsPlayingReference(false);
        // Add gap before exercise
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (referencePlay === "drone") {
        startDrone(rootNotePitch);
      }
      
      startNewRound();
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

      // Map keys to solfege intervals (semitones from root)
      const keyToInterval: Record<string, number> = {
        '1': 0, 'd': 0,  // do
        '2': 2, 'r': 2,  // re
        '3': 4, 'm': 4,  // mi
        '4': 5, 'f': 5,  // fa
        '5': 7, 's': 7,  // sol
        '6': 9, 'l': 9,  // la
        '7': 11, 't': 11, // ti
      };

      // Map shifted number keys to sharp intervals
      const shiftedKeyToInterval: Record<string, number> = {
        '!': 1,  // SHIFT+1 → do#
        '@': 3,  // SHIFT+2 → re#
        '#': 5,  // SHIFT+3 → mi#
        '$': 6,  // SHIFT+4 → fa#
        '%': 8,  // SHIFT+5 → sol#
        '^': 10, // SHIFT+6 → la#
        '&': 12, // SHIFT+7 → ti#
        '"': 3,  // UK layout SHIFT+2
        '£': 5,  // UK layout SHIFT+3
        '€': 6,  // Some layouts SHIFT+4
      };

      const key = e.key.toLowerCase();
      
      // Check for shifted number keys first
      if (e.key in shiftedKeyToInterval) {
        console.log('Shifted key detected:', { key: e.key, code: e.code, shiftKey: e.shiftKey });
        e.preventDefault();
        const midiNote = rootMidi + shiftedKeyToInterval[e.key];
        handleNotePress(midiNote);
      }
      // Then check regular keys
      else if (key in keyToInterval) {
        e.preventDefault();
        let interval = keyToInterval[key];
        // If SHIFT is held with letter keys, play the sharp (semitone higher)
        if (e.shiftKey && /[drmfslt]/.test(key)) {
          interval += 1;
        }
        const midiNote = rootMidi + interval;
        handleNotePress(midiNote);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPosition, numberOfNotes, rootMidi, sequence]);

  const startNewRound = () => {
    const pool = initialMidiNotes;
    const newSequence = generateNextNoteSequence(pool, numberOfNotes, minInterval, maxInterval, rootMidi);
    setSequence(newSequence as number[]);
    setCurrentPosition(0);
    playSequenceWithDelay(newSequence as number[]);
  };

  const playSequenceWithDelay = async (seq: number[]) => {
    setIsPlaying(true);
    console.log('Playing sequence:', { seq, noteGap, noteDuration });
    await playSequence(seq, noteGap, noteDuration);
    setIsPlaying(false);
  };

  const handleNotePress = (scaleNote: number) => {
    if (currentPosition >= numberOfNotes) return;

    const correctNote = sequence[currentPosition];
    setTotalAttempts(totalAttempts + 1);

    // Check if the notes match exactly, or if both are "do" (same pitch class as root)
    const rootPitchClass = rootMidi % 12;
    const pressedPitchClass = scaleNote % 12;
    const correctPitchClass = correctNote % 12;
    
    const isCorrect = scaleNote === correctNote || 
      (pressedPitchClass === rootPitchClass && correctPitchClass === rootPitchClass);

    if (isCorrect) {
      // Play the correct note from the sequence (correct octave)
      playNote(correctNote);
      setCorrectAttempts(correctAttempts + 1);
      setCurrentPosition(currentPosition + 1);
    } else {
      // Play the wrong note that was pressed
      playNote(scaleNote);
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
    }
  };

  const handlePlayAgain = () => {
    playSequenceWithDelay(sequence);
  };

  const handlePlayReference = async () => {
    setIsPlayingReference(true);
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
      await playSequence(arpeggio, 0.15, 1.0);
    } else {
      await playSequence([noteNameToMidi(rootNotePitch)], 0, 2.0);
    }
    setIsPlayingReference(false);
  };

  const handleFinish = () => {
    navigate("/");
  };

  const handleDroneVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setDroneVolumeState(newVolume);
    setDroneVolume(newVolume);
  };

  const generateNextNoteSequence = (
    availableNotes: number[],
    length: number,
    minInterval: number = 1,
    maxInterval: number = 7,
    root: number = 60
  ): number[] => {
    if (availableNotes.length === 0) return [];
    
    // Add an octave above "do" (the root/C) if it's in the available notes
    const notesForSequence = [...availableNotes];
    const rootPitchClass = root % 12;
    availableNotes.forEach(note => {
      const pitchClass = note % 12;
      // Check if this note is "do" (same pitch class as root)
      if (pitchClass === rootPitchClass) {
        // This is "do", add an octave above (if within MIDI range)
        if (note + 12 <= 127) {
          notesForSequence.push(note + 12);
        }
      }
    });
    
    const sequence: number[] = [];
    
    // Helper to convert MIDI note to full scale degree (including octave)
    // Returns -1 if not in major scale
    const getFullScaleDegree = (midiNote: number): number => {
      const pitchClass = midiNote % 12;
      const index = MAJOR_SCALE_PITCH_CLASSES.indexOf(pitchClass);
      if (index === -1) return -1;
      
      // Calculate which octave we're in (MIDI note 0 = C-1)
      const octave = Math.floor(midiNote / 12) - 1;
      
      // Full scale degree: octave * 7 (notes per octave) + position in scale (0-6)
      return octave * 7 + index;
    };
    
    // Pick the first note randomly
    const firstIndex = Math.floor(Math.random() * notesForSequence.length);
    sequence.push(notesForSequence[firstIndex]);
    
    // For subsequent notes, filter by interval constraint
    for (let i = 1; i < length; i++) {
      const prevNote = sequence[i - 1];
      const prevFullDegree = getFullScaleDegree(prevNote);
      
      if (prevFullDegree === -1) {
        // Previous note is not in major scale, allow any note
        const randomIndex = Math.floor(Math.random() * notesForSequence.length);
        sequence.push(notesForSequence[randomIndex]);
        continue;
      }
      
      // Filter available notes based on full scale degree distance
      const validNotes = notesForSequence.filter(note => {
        const fullDegree = getFullScaleDegree(note);
        if (fullDegree === -1) return false; // Skip chromatic notes
        
        // Calculate actual scale degree distance across octaves
        const distance = Math.abs(fullDegree - prevFullDegree);
        
        // Check if distance is within the allowed range
        return distance >= minInterval && distance <= maxInterval;
      });
      
      // If no valid notes (constraint too restrictive), fall-back to any note
      if (validNotes.length === 0) {
        console.log('No valid notes found with current interval constraints; relaxing constraints.');
        const randomIndex = Math.floor(Math.random() * notesForSequence.length);
        sequence.push(notesForSequence[randomIndex]);
      } else {
        const randomIndex = Math.floor(Math.random() * validNotes.length);
        sequence.push(validNotes[randomIndex]);
      }
    }
    
    return sequence;
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleFinish}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Practice</h1>
          {started && (
            <Button
              onClick={handleFinish}
              variant="secondary"
              size="sm"
              className="ml-2"
            >
              Finish
            </Button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {started && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAgain}
                disabled={isPlaying}
              >
                <Play className="h-4 w-4 mr-1" />
                Play Again
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayReference}
                disabled={isPlaying || isPlayingReference}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Reference
              </Button>
              {referencePlay === "drone" && (
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
              <div className="flex gap-3 text-sm ml-2">
                <div className="text-center">
                  <div className="font-bold text-lg">{totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100}%</div>
                  <div className="text-muted-foreground text-xs">Score</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{elapsedMinutes}</div>
                  <div className="text-muted-foreground text-xs">Min</div>
                </div>
              </div>
            </>
          )}
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
                      onClick={() => handleNotePress(pitch+rootMidi)}
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
                      onClick={() => handleNotePress(pitch+rootMidi)}
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
                <CardTitle className="text-center">
                  {isPlayingReference ? (
                    <span className="text-primary animate-pulse">🎵 Reference Playing...</span>
                  ) : (
                    "Identify the notes"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Temporary debug display */}
                {sequence.length > 0 && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <div className="font-semibold">Debug Info (Interval Range: {minInterval}-{maxInterval}):</div>
                    <div>
                      Sequence: {sequence.map((note, idx) => {
                        const solfege = midiToSolfege(note) || midiToNoteName(note);
                        const scaleDegree = MAJOR_SCALE_PITCH_CLASSES.indexOf(note % 12);
                        return `${solfege}(${scaleDegree >= 0 ? scaleDegree + 1 : '?'})`;
                      }).join(' → ')}
                    </div>
                    <div>
                      Intervals: {sequence.slice(1).map((note, idx) => {
                        const prevNote = sequence[idx];
                        const prevDegree = MAJOR_SCALE_PITCH_CLASSES.indexOf(prevNote % 12);
                        const currDegree = MAJOR_SCALE_PITCH_CLASSES.indexOf(note % 12);
                        if (prevDegree === -1 || currDegree === -1) return '?';
                        const distance = Math.abs(currDegree - prevDegree);
                        const valid = distance >= minInterval && distance <= maxInterval;
                        return `${distance}${valid ? '✓' : '✗'}`;
                      }).join(', ')}
                    </div>
                  </div>
                )}
                
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
