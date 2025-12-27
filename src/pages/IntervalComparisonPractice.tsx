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
  startAudio,
} from "@/utils/audio";
import { ConfigData } from "@/config/ConfigData";
import { saveCurrentConfiguration } from "@/utils/settingsStorage";
import { getFavouriteInstruments } from "@/utils/instrumentStorage";
import { SessionHistory, STORED_CONFUSED_INTERVALS } from "./History";
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

  // Calculate note duration based on tempo
  const noteDuration = 60 / settings.tempo;
  const noteGap = noteDuration * 0.15;

  // Random root note for this session (no fixed root needed)
  const [rootMidi] = useState<MidiNoteNumber>(() => {
    const middleC = 60;
    return middleC + Math.floor(Math.random() * 13); // Random root within up to 12 notes above C4 - don't go too low!
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
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  const [droneVolume] = useState(-8);

  const totalSequencesAnswered = useRef(0);
  const lastQuestionKey = useRef<string>("");
  
  // Track confused intervals for this session: Map<"targetInterval,selectedInterval", count>
  const confusedIntervalsRef = useRef<Map<string, number>>(new Map());

  const isQuestionComplete = (): boolean => {
    return isCorrect === true;
  };

  async function startPractice() {
    setIsAudioLoaded(true);
    // No drone or reference for this exercise type
    startNewRound();
  }


  useEffect(() => {
    startAudio(settings.pickInstrument(), true, isAudioLoaded, setAudioLoading, startPractice);    
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
      if (e.key === "a" && isAudioLoaded && !isPlaying) {
        e.preventDefault();
        handlePlayAgain();
        return;
      }

      // Number keys for selecting intervals
      if (e.key >= "1" && e.key <= "9" && isAudioLoaded && !isQuestionComplete()) {
        const index = parseInt(e.key, 10)-1;
        if (index > 0 && index < sequence.length) {
          e.preventDefault();
          handleIntervalSelect(index);
        }
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [sequence, isAudioLoaded, isPlaying, isCorrect]);

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
    let currentOffset = isAscending ? 0 : 12; // Start at root, or from an octave above if descending to leave space
    const newSequence: SemitoneOffset[] = [currentOffset]; 
    
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
      currentOffset += isAscending ? intervalToUse : (-intervalToUse);
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
    } else {
      // Track the confusion: target interval vs what user selected
      const targetInterval = settings.intervalToFind;
      const selectedInterval = Math.abs(sequence[index] - sequence[index - 1]);
      const confusionKey = `${targetInterval},${selectedInterval}`;
      const currentCount = confusedIntervalsRef.current.get(confusionKey) || 0;
      confusedIntervalsRef.current.set(confusionKey, currentCount + 1);
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

      // Save confused intervals for this session
      localStorage.setItem(
        STORED_CONFUSED_INTERVALS,
        JSON.stringify(Array.from(confusedIntervalsRef.current.entries()))
      );

      navigate("/history");
    } else {
      navigate("/");
    }
  };

  const handleDroneVolumeChange = () => {
    // No drone for this exercise
  };

  return (<>
    {!isAudioLoaded ? (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={() => startAudio(settings.pickInstrument(), true, isAudioLoaded, setAudioLoading, startPractice)} 
              disabled={isAudioLoading}
              className="w-full"
              size="lg"
            >
              {isAudioLoading ? "Loading..." : "Load sounds"}
            </Button>
          </CardContent>
        </Card>
      ) 
  : (<>
   <div className="min-h-screen bg-background flex flex-col p-4 max-w-2xl mx-auto">

      <PracticeHeader
        showReference={false}
        correctAttempts={correctAttempts}
        totalAttempts={totalAttempts}
        elapsedSeconds={elapsedSeconds}
        started={isAudioLoaded}
        isPlaying={isPlaying}
        isPlayingReference={false}
        droneType="none"
        droneVolume={droneVolume}
        onPlayAgain={handlePlayAgain}
        onPlayReference={handlePlayReference}
        onFinish={handleFinish}
        onDroneVolumeChange={handleDroneVolumeChange}
      />

     <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
              <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Interval comparison</h3>
                <p className="text-sm text-muted-foreground">
                  Find the <b>{semitonesToInterval(settings.intervalToFind)}</b> among the other intervals
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
                        {isQuestionComplete() && (
                          <div className="text-xs font-medium text-muted-foreground mt-1">
                            
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
                  // const isTargetInterval = intervalFromPrevious === settings.intervalToFind;

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
                        {isQuestionComplete() && (
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              {intervalName}
                            </div>
                            <div className="flex gap-0.5">
                              {Array.from({ length: intervalFromPrevious }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                                />
                              ))}
                            </div>
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
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
    </>)}</>);
};

export default IntervalComparisonPractice;
