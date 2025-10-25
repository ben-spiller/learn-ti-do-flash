import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Play, Volume2, X, VolumeX, Volume1, Check } from "lucide-react";
import { stopSounds, MidiNoteNumber, SemitoneOffset, playNote, playSequence, semitonesToSolfege, midiToNoteName, noteNameToMidi, preloadInstrumentWithGesture, MAJOR_SCALE_PITCH_CLASSES, startDrone, stopDrone, setDroneVolume } from "@/utils/audio";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfigData } from "@/config/ConfigData";
import { saveCurrentConfiguration } from "@/utils/settingsStorage";
import { getNoteButtonColor, getScoreColor } from "@/utils/noteStyles";
import { SessionHistory, STORED_NEEDS_PRACTICE_SEQUENCES, STORED_FREQUENTLY_WRONG_2_NOTE_SEQUENCES as STORED_WRONG_2_NOTE_SEQUENCES, STORED_FREQUENTLY_CONFUSED_PAIRS } from "./PracticeHistory";


const PracticeView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize settings with defaults, then override with any passed state
  const settings = new ConfigData(location.state as Partial<ConfigData>);
  const preloaded = (location.state as any)?.preloaded || false;

  // Calculate note duration based on tempo (BPM)
  // At 60 BPM, each beat = 1 second; at 120 BPM, each beat = 0.5 seconds
  const noteDuration = 60 / settings.tempo;
  const noteGap = noteDuration * 0.15; // Gap is 15% of note duration

  /** The MIDI note of the root/do note for this particular exercise (may be randomly selected based on the config) */  
  const [rootMidi, setRootMidi] = useState<MidiNoteNumber>(noteNameToMidi(settings.rootNotePitch)+(Math.floor(Math.random() * 6)-3));

  const prevSequence = useRef<SemitoneOffset[]>([]);
  const totalSequencesAnswered = useRef(0);
  const [sequence, setSequence] = useState<SemitoneOffset[]>([]);
  const sequenceItems = useRef<Array<{ note: number; duration: number; gapAfter: number }>>([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastPressedNote, setLastPressedNote] = useState<SemitoneOffset | null>(null);
  const [lastPressedWasCorrect, setLastPressedWasCorrect] = useState<boolean | null>(null);
  /** Number of note presses that were correct */
  const [correctAttempts, setCorrectAttempts] = useState(0);
  /** Total number of note presses */
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [started, setStarted] = useState(preloaded);
  const [hasPreloaded, setHasPreloaded] = useState(preloaded);
  const [droneVolume, setDroneVolumeState] = useState(-8); // default volume in dB
  const [isPlayingReference, setIsPlayingReference] = useState(false);

  /** Count of wrong answers: Maps "prevNote,note" -> count (prevNote="" for note at start of sequence) */
  const wrong2NoteSequences = useRef<Map<string, number>>((() => {
    const stored = localStorage.getItem(STORED_WRONG_2_NOTE_SEQUENCES);
    return stored ? new Map(JSON.parse(stored)) : new Map();
  })());  
  /** Pairs of notes that are confused with each other (bidirectional): Maps "noteA,noteB" -> count where noteA < noteB */
  const confusedPairs = useRef<Map<string, number>>((() => {
    const stored = localStorage.getItem(STORED_FREQUENTLY_CONFUSED_PAIRS);
    return stored ? new Map(JSON.parse(stored)) : new Map();
  })());
  /** 2-note sequences that need more practice */
  const needsPractice = useRef<Map<string, number>>((() => {
    const stored = localStorage.getItem(STORED_NEEDS_PRACTICE_SEQUENCES+settings.getExerciseName());
    return stored ? new Map(JSON.parse(stored)) : new Map();
  })());

  // Helper to persist practice data to localStorage
  const savePracticeData = () => {
    localStorage.setItem(STORED_WRONG_2_NOTE_SEQUENCES, JSON.stringify(Array.from(wrong2NoteSequences.current.entries())));
    localStorage.setItem(STORED_FREQUENTLY_CONFUSED_PAIRS, JSON.stringify(Array.from(confusedPairs.current.entries())));
    localStorage.setItem(STORED_NEEDS_PRACTICE_SEQUENCES+settings.getExerciseName(), JSON.stringify(Array.from(needsPractice.current.entries())));
  };

  // Shared spacing constants used by both the solfege column and the chromatic column.
  // Units: rem for the layout math, and Tailwind margin classes for the button stack.
  const WIDE_GAP_REM = 1.0; // rem - used for both solfege stack spacing and chromatic math
  const NARROW_GAP_REM = 0.2; // rem - used for smaller spacing

  async function doStart() {
      if (settings.droneType !== "none") {
        // Start drone if configured
        startDrone(rootMidi, droneVolume);
      }
        
      await handlePlayReference();

      // Add gap before exercise
      await new Promise(resolve => setTimeout(resolve, 800));
      
      wrong2NoteSequences.current.clear();
      confusedPairs.current.clear();

      // Now start the first round
      startNewRound();
      
      //playReferenceAndStart();
  }
  
  // Auto-start if coming from Settings with preloaded samples
  useEffect(() => {
    if (started && preloaded) {
      // Save current configuration when auto-starting from preloaded flow
      saveCurrentConfiguration(settings);
      doStart();
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
    
    // Save current configuration to local storage
    saveCurrentConfiguration(settings);
    
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
      
      doStart();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Next button shortcuts
      if ((e.key === 'n' || e.key === 'Enter') && currentPosition === settings.numberOfNotes) {
        e.preventDefault();
        startNewRound();
        return;
      }

      // Play again shortcut
      if (e.key === 'a' && started && !isPlaying) {
        e.preventDefault();
        handlePlayAgain();
        return;
      }

      // Reference shortcut
      if (e.key === 'e' && started && !isPlaying && !isPlayingReference) {
        e.preventDefault();
        handlePlayReference();
        return;
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
        handleNotePress(shiftedKeyToInterval[e.key]);
      }
      // Then check regular keys
      else if (key in keyToInterval) {
        e.preventDefault();
        let interval = keyToInterval[key];
        // If SHIFT is held with letter keys, play the sharp (semitone higher)
        if (e.shiftKey && /[drmfslt]/.test(key)) {
          interval += 1;
        }
        handleNotePress(interval);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPosition, settings.numberOfNotes, rootMidi, sequence, started, isPlaying, isPlayingReference]);

  const startNewRound = () => {
    prevSequence.current = [...sequence];
    //console.log("Previous sequence saved: "+JSON.stringify(prevSequence.current.map(n => semitonesToSolfege(n))));
    const newSequence = generateNextNoteSequence();
    setSequence(newSequence as number[]);
    
    // Generate durations for this sequence
    const durations = generateSequenceDurations(newSequence.length + settings.playExtraNotes);
    
    // Generate extra notes deterministically
    const extraNotesOffsets: SemitoneOffset[] = [];
    if (settings.playExtraNotes > 0) {
      let pool = [...settings.selectedNotes];
      // Add octave above root if root is in pool
      if (pool.indexOf(0) !== -1) { pool.push(12); }
      
      for (let i = 0; i < settings.playExtraNotes; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        extraNotesOffsets.push(pool[randomIndex]);
      }
    }
    
    // Build full SequenceItems array (main sequence + extra notes)
    const items = [
      ...newSequence.map((offset, i) => ({
        note: rootMidi + offset,
        duration: durations[i],
        gapAfter: noteGap
      })),
      ...extraNotesOffsets.map((offset, i) => ({
        note: rootMidi + offset,
        duration: durations[settings.numberOfNotes + i],
        gapAfter: noteGap
      }))
    ];
    sequenceItems.current = items;
    
    setCurrentPosition(0);
    // measure each questions separately, so we can ignore times when the user left it for ages
    // start the timer just before we play the notes
    setQuestionStartTime(Date.now());
    playSequenceWithDelay();
  };

  const generateSequenceDurations = (length: number): number[] => {
    if (settings.rhythm !== "random") {
      // Fixed rhythm - all notes same duration
      return Array(length).fill(noteDuration);
    }
    
    // Random rhythm - choose from 3 duration options
    const durationOptions = [noteDuration, noteDuration * 1.5, noteDuration * 2];
    return Array.from({ length }, () => {
      const randomIndex = Math.floor(Math.random() * durationOptions.length);
      return durationOptions[randomIndex];
    });
  };

  const playSequenceWithDelay = async () => {
    stopSounds();
    setIsPlaying(true);
    console.debug('Playing sequence:', sequenceItems.current);
    
    await playSequence(sequenceItems.current);
    
    setIsPlaying(false);
  };

  const handleNotePress = (selectedNote: SemitoneOffset) => {
    if (currentPosition >= settings.numberOfNotes) { // at the end, just play whatever they pressed
      stopSounds();
      playNote(selectedNote+rootMidi);
      return;
    }

    const correctNote = sequence[currentPosition];
    setTotalAttempts(totalAttempts + 1);

    // Check if the notes match
    const isCorrect = selectedNote%12 === correctNote%12;

    // Store the pressed note and feedback
    setLastPressedNote(selectedNote);
    setLastPressedWasCorrect(isCorrect);

    // Update practice tracking
    const correctInterval = correctNote;
    const prevInterval = currentPosition === 0 ? '' : sequence[currentPosition - 1];
    const pairKey = `${prevInterval},${correctInterval}`;

    if (isCorrect) {
      // Play the correct note from the sequence (correct octave)
      stopSounds();
      playNote(correctNote+rootMidi);

      // Decrement needsPractice for correct answer
      const currentCount = needsPractice.current.get(pairKey) || 0;
      if (currentCount > 0) {
        const newCount = currentCount - 1;
        if (newCount <= 0) {
          needsPractice.current.delete(pairKey);
        } else {
          needsPractice.current.set(pairKey, newCount);
        }
      }

      // once we completed this question, add to the elapsed time 
      if (currentPosition+1 === settings.numberOfNotes) {
        totalSequencesAnswered.current += 1;
        if (Date.now() - questionStartTime > 60000) {
          // avoid counting up wildly big times
          console.log("Ignoring time spent on this question as user probably stepped away from the app");
        } else {
          setElapsedSeconds(elapsedSeconds + (Math.floor((Date.now() - questionStartTime) / 1000)));
        }
      }
      savePracticeData();

      setCorrectAttempts(correctAttempts + 1);
      setCurrentPosition(currentPosition + 1);

      // Clear feedback after animation
      setTimeout(() => {
        setLastPressedNote(null);
        setLastPressedWasCorrect(null);
      }, 600);
    } else {
      // Play the wrong note that was pressed
      stopSounds();
      playNote(selectedNote+rootMidi);

      // Update wrong answer count
      wrong2NoteSequences.current.set(pairKey, (wrong2NoteSequences.current.get(pairKey) || 0) + 1);

      // Track confused pairs (bidirectional - normalize so smaller note comes first)
      const note1 = Math.min(correctInterval, selectedNote);
      const note2 = Math.max(correctInterval, selectedNote);
      const confusedPairKey = `${note1},${note2}`;
      confusedPairs.current.set(confusedPairKey, (confusedPairs.current.get(confusedPairKey) || 0) + 1);

      // Add to needsPractice for the CORRECT note (+3 if first wrong answer or in the danger zone, +1 otherwise)
      let needsPracticeCount = (needsPractice.current.get(pairKey) || 0);
      needsPractice.current.set(pairKey, needsPracticeCount + (
        (needsPracticeCount <3) ? +3 : +1));
      
      // Also increment needsPractice for the INCORRECT note that was entered
      const incorrectPairKey = `${prevInterval},${selectedNote}`;
      const incorrectNeedsPracticeCount = (needsPractice.current.get(incorrectPairKey) || 0);
      needsPractice.current.set(incorrectPairKey, incorrectNeedsPracticeCount + 1);
      
      savePracticeData();

      // Clear feedback after animation
      setTimeout(() => {
        setLastPressedNote(null);
        setLastPressedWasCorrect(null);
      }, 600);
    }
  };

  const handlePlayAgain = () => {
    playSequenceWithDelay();
  };

  const handlePlayReference = async () => {
    setIsPlayingReference(true);
    if (settings.referenceType === "arpeggio") {
      const doMidi = rootMidi;
      const arpeggio = [
        doMidi,           // do
        doMidi + 4,       // mi
        doMidi + 7,       // sol
        doMidi + 12,      // do (octave up)
        doMidi + 7,       // sol
        doMidi + 4,       // mi
        doMidi,           // do
      ];
      await playSequence(arpeggio, 0.03, noteDuration*1);
    } else {
      await playSequence([rootMidi], 0, 2.0);
    }
    setIsPlayingReference(false);
  };

  const handleFinish = () => {
    saveCurrentConfiguration(settings);
    // Save session data if at least one question was answered
    if (totalSequencesAnswered.current > 0) {
      const session = {
        sessionDate: Date.now(),
        score: Math.round((correctAttempts / totalAttempts) * 100),
        avgSecsPerAnswer: totalSequencesAnswered.current > 0 ? (elapsedSeconds / totalSequencesAnswered.current) : 0,
        totalAttempts,
        correctAttempts,
        totalSeconds: elapsedSeconds,

        needsPracticeCount: needsPractice.current.size,
        needsPracticeTotalSeverity: Array.from(needsPractice.current.values()).reduce((a, b) => a + b, 0),

        exerciseName: settings.getExerciseName(),
        settings: settings // don't need to copy this because we won't be mutating it anyway
      } satisfies SessionHistory;
      
      // Append to sessions array
      const sessionsStr = localStorage.getItem('practiceSessions');
      const sessions = sessionsStr ? JSON.parse(sessionsStr) : [];
      sessions.push(session);
      localStorage.setItem('practiceSessions', JSON.stringify(sessions));
      
      navigate("/history");
    } else {
      navigate("/");
    }
  };

  const handleDroneVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setDroneVolumeState(newVolume);
    setDroneVolume(newVolume);
  };

  const generateNextNoteSequence = (): SemitoneOffset[] => {
    let pool: SemitoneOffset[] = [...settings.selectedNotes];

    // Special-case: add an octave above "do" (the root) if it's in the available notes
    // (once we properly support compounds intervals we can do this without a special-case)
    if (pool.indexOf(0) !== -1) { pool.push(12); }
    
    const sequence: number[] = [];
    const reason: string[] = [];
    for (let i = 0; i < settings.numberOfNotes; i++) {
      let [n, r] = pickNextNote(pool, sequence);
      sequence.push(n);
      reason.push(r);
    }
    
    console.log("Note sequence is: "+JSON.stringify(sequence.map(n => semitonesToSolfege(n)))+" due to "+reason.join(','));

    return sequence;
  };

  function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }

  /** Pick the next semitone for the current sequence, and a string explaining why it was chosen */
  function pickNextNote(pool: SemitoneOffset[], currentSequence: SemitoneOffset[]): [SemitoneOffset, string] {
      // Choices for this note. Start with the current pool
      pool = [...pool];
      //console.log("Initial pool: "+JSON.stringify(pool));

      const prevNote = currentSequence.length === 0 ? null : currentSequence[currentSequence.length - 1];

      if (prevNote === null) {
          // Avoid same starting note as immediate previous exercise, so we can't end up with duplication
          if (prevSequence.current.length > 0 && pool.length > 1) {
            console.debug("Filtering out previous starting note: "+semitonesToSolfege(prevSequence.current[0]));
            pool = pool.filter(note => note !== prevSequence.current[0]);
          }
      } 
      else // not the first note, so filter by interval 
      {
        let intervalFiltered = pool.filter(note => {
          const distance = Math.abs(note - prevNote);
          return distance >= settings.minInterval && distance <= settings.maxInterval; 
        });
        if (intervalFiltered.length === 0) { console.log("No possible notes after "+semitonesToSolfege(prevNote)); }
        else { pool = intervalFiltered; }
      }

      console.debug("Next note pool after filtering: "+JSON.stringify(pool));

      // Pick a needs practice combination where possible
      // (but reduce the probability if there are only a few entries to avoid too much repetition)
      if (Math.random() < (needsPractice.current.size > 2 ? 0.7 : 0.4)) {
        const practiceNote = pickFromNeedsPractice(pool, prevNote);
        if (practiceNote !== null) {
          console.debug("  picked from needs-practice: "+ semitonesToSolfege(practiceNote));
          return [practiceNote, "needs-practice"];
        }
      }
      // Pick randomly if not
      return [pool[randomInt(pool.length)], "random"];      
  }

  /** Weighted random selection from needsPractice, biased towards higher counts. Returns null if there's no suitable needsPractice note */
  function pickFromNeedsPractice(pool: SemitoneOffset[], prevNote: SemitoneOffset | null): SemitoneOffset | null {
    // Filter needsPractice entries that match the current prevNote and are in the pool
    const validPairs: [string, number][] = [];
    for (const [pairKey, count] of needsPractice.current.entries()) {
      const [storedPrev, storedNote] = pairKey.split(',');
      const storedPrevNum = storedPrev === '' ? null : parseInt(storedPrev);
      const storedNoteNum = parseInt(storedNote);
      
      if (storedPrevNum === prevNote && pool.includes(storedNoteNum)) {
        validPairs.push([pairKey, count]);
      }
    }
    if (validPairs.length === 0) return null;

    // Weight by count (higher count = more likely to be selected)
    const totalWeight = validPairs.reduce((sum, [_, count]) => sum + count, 0);
    let random = Math.random() * totalWeight;
    
    for (const [pairKey, count] of validPairs) {
      random -= count;
      if (random <= 0) {
        const [_, storedNote] = pairKey.split(',');
        return parseInt(storedNote);
      }
    }

    // Fallback to last item
    const [_, lastNote] = validPairs[validPairs.length - 1][0].split(',');
    return parseInt(lastNote);
  }
  


  return (
    <div className="min-h-screen bg-background flex flex-col p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {started && (
            <Button
              onClick={handleFinish}
              variant="outline"
              size="sm"
            >
              Finish
            </Button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {started && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayAgain}
                    disabled={isPlaying}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Again
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play again (keyboard shortcut: a)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayReference}
                    disabled={isPlaying || isPlayingReference}
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Reference
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play reference for this key (keyboard shortcut: e)</p>
                </TooltipContent>
              </Tooltip>
              {settings.droneType !== "none" && (
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
                        min={-30}
                        max={10}
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
                  <div className={`font-bold text-lg ${getScoreColor(totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100)}`}>
                    {totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100}%
                  </div>
                  <div className="text-muted-foreground text-xs">Score</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{(elapsedSeconds/60).toFixed(0)}</div>
                  <div className="text-muted-foreground text-xs">Min</div>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        {started ? (
          <>
            {/* Musical note button div at the top */}
            <div className="flex gap-2">

              {/* Main (major scale / solfege) notes column */}
              <div className="flex-1 flex flex-col">
                {[...MAJOR_SCALE_PITCH_CLASSES].reverse().map((pitch, index) => {
                  let solfege = semitonesToSolfege(pitch, true);
                  
                  // Calculate gap - wider except between Mi-Fa (natural semitone)
                  const nextPitch = [...MAJOR_SCALE_PITCH_CLASSES].reverse()[index + 1];
                  const hasChromatic = nextPitch !== undefined && Math.abs(pitch - nextPitch) === 2;
                  // use rem-based inline margin so units match the chromatic column math
                  const gapStyle = { marginBottom: `${hasChromatic ? WIDE_GAP_REM : NARROW_GAP_REM}rem` } as React.CSSProperties;
                  
                  const isLastPressed = lastPressedNote === pitch;
                  
                  return (
                    <div key={pitch} className="relative" style={index < MAJOR_SCALE_PITCH_CLASSES.length - 1 ? gapStyle : undefined}>
                      <Button
                        onClick={() => handleNotePress(pitch)}
                        className={`h-16 w-full text-xl font-bold text-white relative ${getNoteButtonColor(semitonesToSolfege(pitch))}`}
                        disabled={isPlayingReference}
                      >
                        {solfege}
                        {isLastPressed && lastPressedWasCorrect !== null && (
                          <div className={`absolute inset-0 flex items-center justify-center animate-scale-in`}>
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                              {lastPressedWasCorrect ? (
                                <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
                              ) : (
                                <X className="w-8 h-8 text-red-500" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                        )}
                      </Button>
                    </div>
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
                  
                  const isLastPressed = lastPressedNote === pitch;
                  
                  return (
                    <div key={pitch} className="absolute w-full" style={{ top: `${top}rem` }}>
                      <Button
                        onClick={() => handleNotePress(pitch)}
                        className={`h-12 w-full text-lg font-bold text-white relative ${getNoteButtonColor("semitone")}`}
                        disabled={isPlayingReference}
                        title={semitonesToSolfege(pitch, true)}
                      >
                        # / b
                        {isLastPressed && lastPressedWasCorrect !== null && (
                          <div className={`absolute inset-0 flex items-center justify-center animate-scale-in`}>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                              {lastPressedWasCorrect ? (
                                <Check className="w-7 h-7 text-green-500" strokeWidth={3} />
                              ) : (
                                <X className="w-7 h-7 text-red-500" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress card */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-center">
                  {isPlayingReference ? (
                    <span className="text-primary animate-pulse">🎵 Playing reference "{midiToNoteName(rootMidi)}"...</span>
                  ) : (
                    "Identify the notes"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Temporary debug display */}
                {/* {sequence.length > 0 && false && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <div className="font-semibold">Debug Info (Interval Range: {settings.minInterval}-{settings.maxInterval}):</div>
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
                        const valid = distance >= settings.minInterval && distance <= settings.maxInterval;
                        return `${distance}${valid ? '✓' : '✗'}`;
                      }).join(', ')}
                    </div>
                  </div>
                )} */}
                
                <div className="flex gap-2 justify-center flex-wrap">
                  {Array.from({ length: settings.numberOfNotes }).map((_, index) => {
                    const isAnswered = index < currentPosition;
                    const noteSolfege = isAnswered ? (semitonesToSolfege(sequence[index])) : "?";
                    const colorClass = isAnswered ? getNoteButtonColor(noteSolfege) : "bg-muted";
                    
                    return (
                      <div
                        key={index}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm transition-colors text-white ${colorClass}`}
                      >
                        {noteSolfege}
                      </div>
                    );
                  })}
                </div>
                {currentPosition === settings.numberOfNotes && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <span className="text-lg font-semibold text-success">Complete! 🎉</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={startNewRound} size="lg">
                            Next
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Press N or Enter</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
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

export default PracticeView;
