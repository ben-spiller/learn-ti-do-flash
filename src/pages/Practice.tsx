import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Volume2, VolumeX, Volume1 } from "lucide-react";
import { stopSounds, MidiNoteNumber, SemitoneOffset, playSequence, midiToNoteName, noteNameToMidi, preloadInstrumentWithGesture, startDrone, stopDrone, setDroneVolume, semitonesToSolfege } from "@/utils/audio";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfigData, ExerciseType } from "@/config/ConfigData";
import { saveCurrentConfiguration } from "@/utils/settingsStorage";
import { getFavouriteInstruments } from "@/utils/instrumentStorage";
import { getScoreColor } from "@/utils/noteStyles";
import { SessionHistory, STORED_NEEDS_PRACTICE_SEQUENCES, STORED_FREQUENTLY_WRONG_2_NOTE_SEQUENCES as STORED_WRONG_2_NOTE_SEQUENCES, STORED_FREQUENTLY_CONFUSED_PAIRS } from "./History";
import { NoteRecognitionPractice } from "@/components/NoteRecognitionPractice";
import { IntervalComparisonPractice } from "@/components/IntervalComparisonPractice";


const PracticeView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize settings from query params (if present), otherwise from state or defaults
  const searchParams = new URLSearchParams(location.search);
  const hasQueryParams = searchParams.toString().length > 0;
  
  const settings = hasQueryParams 
    ? ConfigData.fromQueryParams(searchParams)
    : new ConfigData(location.state as Partial<ConfigData>);
  
  const preloaded = searchParams.get('preloaded') === 'true';
  
  // Pick the instrument to use for this session based on settings
  const sessionInstrument = settings.pickInstrument(getFavouriteInstruments());

  // Calculate note duration based on tempo (BPM)
  // At 60 BPM, each beat = 1 second; at 120 BPM, each beat = 0.5 seconds
  const noteDuration = 60 / settings.tempo;
  const noteGap = noteDuration * 0.15; // Gap is 15% of note duration

  /** The MIDI note of the root/do note for this particular exercise (may be randomly selected based on the config) */  
  const [rootMidi, setRootMidi] = useState<MidiNoteNumber>(noteNameToMidi(settings.rootNotePitch)+(Math.floor(Math.random() * 6)-3));

  const totalSequencesAnswered = useRef(0);
  const prevSequence = useRef<SemitoneOffset[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Number of note presses that were correct */
  const [correctAttempts, setCorrectAttempts] = useState(0);
  /** Total number of note presses */
  const [totalAttempts, setTotalAttempts] = useState(0);
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
    const stored = localStorage.getItem(STORED_NEEDS_PRACTICE_SEQUENCES+settings.getExerciseType());
    return stored ? new Map(JSON.parse(stored)) : new Map();
  })());

  // Helper to persist practice data to localStorage
  const savePracticeData = () => {
    localStorage.setItem(STORED_WRONG_2_NOTE_SEQUENCES, JSON.stringify(Array.from(wrong2NoteSequences.current.entries())));
    localStorage.setItem(STORED_FREQUENTLY_CONFUSED_PAIRS, JSON.stringify(Array.from(confusedPairs.current.entries())));
    localStorage.setItem(STORED_NEEDS_PRACTICE_SEQUENCES+settings.getExerciseType(), JSON.stringify(Array.from(needsPractice.current.entries())));
  };


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
  }
  
  // Auto-start if coming from Settings with preloaded instrument
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
    
    const ok = await preloadInstrumentWithGesture(sessionInstrument);
    
    clearTimeout(loadingTimer);
    setShowLoadingIndicator(false);
    setIsPreloading(false);
    
    if (ok) {
      setHasPreloaded(true);
      setStarted(true);
      
      doStart();
    }
  };

  const handlePlayAgain = () => {
    // This will be implemented differently by each child component
    // For now, just a placeholder that stops sounds
    stopSounds();
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
    savePracticeData();
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

        exerciseName: settings.getExerciseType(),
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
    const pool: SemitoneOffset[] = settings.getNotePool();
    
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
          return distance >= settings.consecutiveIntervals[0] && distance <= settings.consecutiveIntervals[1]; 
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
            {(settings.getExerciseType() === ExerciseType.MelodyRecognition || 
              settings.getExerciseType() === ExerciseType.SingleNoteRecognition) && (
              <NoteRecognitionPractice
                settings={settings}
                rootMidi={rootMidi}
                noteDuration={noteDuration}
                noteGap={noteGap}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                isPlayingReference={isPlayingReference}
                correctAttempts={correctAttempts}
                setCorrectAttempts={setCorrectAttempts}
                totalAttempts={totalAttempts}
                setTotalAttempts={setTotalAttempts}
                elapsedSeconds={elapsedSeconds}
                setElapsedSeconds={setElapsedSeconds}
                totalSequencesAnswered={totalSequencesAnswered}
                wrong2NoteSequences={wrong2NoteSequences}
                confusedPairs={confusedPairs}
                needsPractice={needsPractice}
                handlePlayAgain={handlePlayAgain}
                handlePlayReference={handlePlayReference}
              />
            )}

            {settings.getExerciseType() === ExerciseType.IntervalComparison && (
              <IntervalComparisonPractice
                settings={settings}
                rootMidi={rootMidi}
                noteDuration={noteDuration}
                noteGap={noteGap}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                isPlayingReference={isPlayingReference}
                correctAttempts={correctAttempts}
                setCorrectAttempts={setCorrectAttempts}
                totalAttempts={totalAttempts}
                setTotalAttempts={setTotalAttempts}
                elapsedSeconds={elapsedSeconds}
                setElapsedSeconds={setElapsedSeconds}
                totalSequencesAnswered={totalSequencesAnswered}
                handlePlayAgain={handlePlayAgain}
                handlePlayReference={handlePlayReference}
              />
            )}
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
