import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Minus } from "lucide-react";
import {
  stopSounds,
  MidiNoteNumber,
  SemitoneOffset,
  playSequence,
  preloadInstrumentWithGesture,
  noteNameToMidi,
  semitonesToInterval,
} from "@/utils/audio";
import { ConfigData } from "@/config/ConfigData";
import { saveCurrentConfiguration } from "@/utils/settingsStorage";
import { getFavouriteInstruments } from "@/utils/instrumentStorage";
import { SessionHistory } from "./History";
import { PracticeHeader } from "@/components/PracticeHeader";

const IntervalComparisonPractice = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize settings from query params or state
  const searchParams = new URLSearchParams(location.search);
  const hasQueryParams = searchParams.toString().length > 0;

  const settings = hasQueryParams
    ? ConfigData.fromQueryParams(searchParams)
    : new ConfigData(location.state as Partial<ConfigData>);

  const preloaded = searchParams.get("preloaded") === "true";

  // Pick the instrument to use for this session
  const sessionInstrument = settings.pickInstrument(getFavouriteInstruments());

  // Calculate note duration based on tempo
  const noteDuration = 60 / settings.tempo;
  const noteGap = noteDuration * 0.15;

  // Random root note for this session (no fixed root needed)
  const [rootMidi] = useState<MidiNoteNumber>(() => {
    const middleC = 60;
    return middleC + Math.floor(Math.random() * 13) - 6; // Random root within ±6 semitones of C4
  });

  const [sequence, setSequence] = useState<SemitoneOffset[]>([]);
  const sequenceItems = useRef<Array<{ note: number; duration: number; gapAfter: number }>>([]);
  const [differentIntervalIndex, setDifferentIntervalIndex] = useState<number>(-1);
  const [currentGuess, setCurrentGuess] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number>(-1);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [isAudioLoading, setAudioLoading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [started, setStarted] = useState(preloaded);

  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [droneVolume] = useState(-8);

  const totalSequencesAnswered = useRef(0);
  const lastQuestionKey = useRef<string>("");

  const isQuestionComplete = (): boolean => {
    return isCorrect === true;
  };

  async function doStart() {
    // No drone or reference for this exercise type
    startNewRound();
  }

  // Auto-start if coming from Settings with preloaded instrument
  useEffect(() => {
    if (started && preloaded) {
      saveCurrentConfiguration(settings);
      doStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Next button shortcut
      if ((e.key === "n" || e.key === "Enter") && isQuestionComplete()) {
        e.preventDefault();
        startNewRound();
        return;
      }

      // Play again shortcut
      if (e.key === "a" && started && !isPlaying) {
        e.preventDefault();
        handlePlayAgain();
        return;
      }

      // Number keys for selecting intervals
      if (e.key >= "1" && e.key <= "9" && started && !isQuestionComplete()) {
        const index = parseInt(e.key, 10);
        if (index > 0 && index < sequence.length) {
          e.preventDefault();
          handleIntervalSelect(index);
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [sequence, started, isPlaying, isCorrect]);

  const handleStart = async () => {
    if (started) return;

    saveCurrentConfiguration(settings);

    setAudioLoading(true);

    const loadingTimer = setTimeout(() => {
      setShowLoadingIndicator(true);
    }, 400);

    const ok = await preloadInstrumentWithGesture(sessionInstrument);

    clearTimeout(loadingTimer);
    setShowLoadingIndicator(false);
    setAudioLoading(false);

    if (ok) {
      setStarted(true);
      doStart();
    }
  };

  const startNewRound = () => {
    // Generate a sequence with one target interval and other intervals from otherIntervals
    const sequenceLength = settings.numberOfNotes;
    
    // Determine direction for this question
    let isAscending: boolean;
    if (settings.intervalDirection === 'random') {
      isAscending = Math.random() > 0.5;
    } else if (settings.intervalDirection === 'ascending') {
      isAscending = true;
    } else { // 'descending'
      isAscending = false;
    }

    // Pick which position will have the target interval (not the first)
    const targetIndex = 1 + Math.floor(Math.random() * (sequenceLength - 1));
    setDifferentIntervalIndex(targetIndex);

    // Build sequence
    const newSequence: SemitoneOffset[] = [isAscending ? 0 : 12]; // Start at root, or from an octave above if descending
    let currentOffset = 0;
    
    // Track which intervals we use to check for duplicates
    const usedIntervals: number[] = [];
    
    // Generate pool of other intervals from range
    const otherIntervalsPool: SemitoneOffset[] = [];
    for (let i = settings.intervalComparisonRange[0]; i <= settings.intervalComparisonRange[1]; i++) {
      if (i !== settings.intervalToFind) {
        otherIntervalsPool.push(i as SemitoneOffset);
      }
    }
    
    for (let i = 1; i < sequenceLength; i++) {
      const intervalToUse = i === targetIndex ? settings.intervalToFind : 
        otherIntervalsPool[Math.floor(Math.random() * otherIntervalsPool.length)];
      usedIntervals.push(intervalToUse);
      currentOffset += isAscending ? intervalToUse : -intervalToUse;
      newSequence.push(currentOffset);
    }

    // Check if this is the same as the last question (same intervals in same order and direction)
    const currentKey = `${isAscending ? 'asc' : 'desc'}-${usedIntervals.join(',')}`;
    if (currentKey === lastQuestionKey.current && totalSequencesAnswered.current > 0) {
      // Try again with different configuration
      startNewRound();
      return;
    }
    lastQuestionKey.current = currentKey;

    setSequence(newSequence);
    setCurrentGuess(null);
    setIsCorrect(null);
    setQuestionStartTime(Date.now());

    // Generate durations
    const durations = generateSequenceDurations(sequenceLength);

    // Build sequence items for playback
    sequenceItems.current = newSequence.map((offset, i) => ({
      note: rootMidi + offset,
      duration: durations[i],
      gapAfter: noteGap,
    }));
    

    playSequenceWithDelay();
  };

  const generateSequenceDurations = (length: number): number[] => {
    if (settings.rhythm !== "random") {
      return Array(length).fill(noteDuration);
    }

    const durationOptions = [noteDuration, noteDuration * 1.5, noteDuration * 2];
    return Array.from({ length }, () => {
      const randomIndex = Math.floor(Math.random() * durationOptions.length);
      return durationOptions[randomIndex];
    });
  };

  const playSequenceWithDelay = async () => {
    stopSounds();
    setIsPlaying(true);
    setCurrentlyPlayingIndex(-1);

    // Play each note with visual feedback
    for (let i = 0; i < sequenceItems.current.length; i++) {
      setCurrentlyPlayingIndex(i);
      await playSequence([sequenceItems.current[i]]);
    }

    setCurrentlyPlayingIndex(-1);
    setIsPlaying(false);
  };

  const handleIntervalSelect = (index: number) => {
    if (isQuestionComplete()) return;

    setCurrentGuess(index);
    setTotalAttempts(totalAttempts + 1);

    const correct = index === differentIntervalIndex;
    setIsCorrect(correct);

    if (correct) {
      setCorrectAttempts(correctAttempts + 1);
      totalSequencesAnswered.current += 1;

      if (Date.now() - questionStartTime < 60000) {
        setElapsedSeconds(elapsedSeconds + Math.floor((Date.now() - questionStartTime) / 1000));
      }
    }
  };

  const handlePlayAgain = () => {
    playSequenceWithDelay();
  };

  const handlePlayReference = async () => {
    // No reference needed for this exercise
  };

  const handleFinish = () => {
    saveCurrentConfiguration(settings);
    if (totalSequencesAnswered.current > 0) {
      const session = {
        sessionDate: Date.now(),
        score: Math.round((correctAttempts / totalAttempts) * 100),
        avgSecsPerAnswer:
          totalSequencesAnswered.current > 0 ? elapsedSeconds / totalSequencesAnswered.current : 0,
        totalAttempts,
        correctAttempts,
        totalSeconds: elapsedSeconds,
        needsPracticeCount: 0,
        needsPracticeTotalSeverity: 0,
        exerciseName: settings.exerciseType,
        settings: settings,
      } satisfies SessionHistory;

      const sessionsStr = localStorage.getItem("practiceSessions");
      const sessions = sessionsStr ? JSON.parse(sessionsStr) : [];
      sessions.push(session);
      localStorage.setItem("practiceSessions", JSON.stringify(sessions));

      navigate("/history");
    } else {
      navigate("/");
    }
  };

  const handleDroneVolumeChange = () => {
    // No drone for this exercise
  };

  return (
   <div className="min-h-screen bg-background flex flex-col p-4 max-w-2xl mx-auto">

      <PracticeHeader
        showReference={false}
        correctAttempts={correctAttempts}
        totalAttempts={totalAttempts}
        elapsedSeconds={elapsedSeconds}
        started={started}
        isPlaying={isPlaying}
        isPlayingReference={isPlayingReference}
        droneType="none"
        droneVolume={droneVolume}
        onPlayAgain={handlePlayAgain}
        onPlayReference={handlePlayReference}
        onFinish={handleFinish}
        onDroneVolumeChange={handleDroneVolumeChange}
      />

      {started && (
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
              <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Which interval is different?</h3>
                <p className="text-sm text-muted-foreground">
                  Find the {semitonesToInterval(settings.intervalToFind)} among the other intervals
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {sequence.map((offset, index) => {
                  const isCurrentlyPlaying = currentlyPlayingIndex === index;
                  
                  if (index === 0) {
                    // First note - not selectable
                    return (
                      <div key={index} className="flex flex-col items-center gap-1">
                        <div
                          className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-muted bg-muted/50"
                        >
                          <span className="text-xl font-bold text-muted-foreground">1</span>
                        </div>
                        <div className="h-2 flex items-center justify-center">
                          {isCurrentlyPlaying && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        {isCorrect !== null && (
                          <div className="text-xs font-medium text-muted-foreground mt-1">
                            Root
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isSelected = currentGuess === index;
                  const showAsCorrect = isCorrect && isSelected;
                  const showAsWrong = isCorrect === false && isSelected;
                  
                  // Calculate interval from previous note
                  const intervalFromPrevious = Math.abs(offset - sequence[index - 1]);
                  const intervalName = semitonesToInterval(intervalFromPrevious);
                  
                  // Check if this is the target interval
                  const isTargetInterval = intervalFromPrevious === settings.intervalToFind;

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="lg"
                          onClick={() => handleIntervalSelect(index)}
                          disabled={isQuestionComplete()}
                          className={`w-16 h-16 text-xl font-bold ${
                            showAsCorrect
                              ? "bg-green-500 hover:bg-green-600 border-green-600"
                              : showAsWrong
                              ? "bg-red-500 hover:bg-red-600 border-red-600"
                              : ""
                          }`}
                        >
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        {index + 1}
                        </Button>
                        <div className="h-2 flex items-center justify-center">
                          {isCurrentlyPlaying && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        {isCorrect !== null && (
                          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1">
                            {isTargetInterval ? (
                              <ArrowRight className="h-4 w-4" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {intervalName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isQuestionComplete() && (
                <div className="flex justify-center mt-6">
                  <Button size="lg" onClick={startNewRound}>
                    Next (N or Enter)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntervalComparisonPractice;
