import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
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
  const [differentIntervalIndex, setDifferentIntervalIndex] = useState<number>(-1);
  const [currentGuess, setCurrentGuess] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [started, setStarted] = useState(preloaded);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [droneVolume] = useState(-8);

  const totalSequencesAnswered = useRef(0);

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

    setIsPreloading(true);

    const loadingTimer = setTimeout(() => {
      setShowLoadingIndicator(true);
    }, 400);

    const ok = await preloadInstrumentWithGesture(sessionInstrument);

    clearTimeout(loadingTimer);
    setShowLoadingIndicator(false);
    setIsPreloading(false);

    if (ok) {
      setStarted(true);
      doStart();
    }
  };

  const startNewRound = () => {
    // Generate a sequence with one different interval
    const sequenceLength = 4 + Math.floor(Math.random() * 3); // 4-6 notes
    const isAscending = Math.random() > 0.5;
    const [interval1, interval2] = settings.comparisonIntervals;
    const mainInterval = Math.random() > 0.5 ? interval1 : interval2;
    const differentInterval = mainInterval === interval1 ? interval2 : interval1;

    // Pick which position will have the different interval (not the first)
    const diffIndex = 1 + Math.floor(Math.random() * (sequenceLength - 1));
    setDifferentIntervalIndex(diffIndex);

    // Build sequence
    const newSequence: SemitoneOffset[] = [0]; // Start at root
    let currentOffset = 0;
    for (let i = 1; i < sequenceLength; i++) {
      const intervalToUse = i === diffIndex ? differentInterval : mainInterval;
      currentOffset += isAscending ? intervalToUse : -intervalToUse;
      newSequence.push(currentOffset);
    }

    setSequence(newSequence);
    setCurrentGuess(null);
    setIsCorrect(null);
    setQuestionStartTime(Date.now());

    // Generate durations
    const durations = generateSequenceDurations(sequenceLength);

    // Build sequence items for playback
    const items = newSequence.map((offset, i) => ({
      note: rootMidi + offset,
      duration: durations[i],
      gapAfter: noteGap,
    }));

    playSequenceWithDelay(items);
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

  const playSequenceWithDelay = async (items: Array<{ note: number; duration: number; gapAfter: number }>) => {
    stopSounds();
    setIsPlaying(true);

    await playSequence(items);

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
    const durations = generateSequenceDurations(sequence.length);
    const items = sequence.map((offset, i) => ({
      note: rootMidi + offset,
      duration: durations[i],
      gapAfter: noteGap,
    }));
    playSequenceWithDelay(items);
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
        exerciseName: settings.getExerciseType(),
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
      <PracticeHeader
        correctAttempts={correctAttempts}
        totalAttempts={totalAttempts}
        elapsedSeconds={elapsedSeconds}
        started={started}
        isPreloading={isPreloading}
        showLoadingIndicator={showLoadingIndicator}
        isPlaying={isPlaying}
        isPlayingReference={isPlayingReference}
        droneType="none"
        droneVolume={droneVolume}
        onStart={handleStart}
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
                  Comparing {semitonesToInterval(settings.comparisonIntervals[0])} and{" "}
                  {semitonesToInterval(settings.comparisonIntervals[1])}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {sequence.map((_, index) => {
                  if (index === 0) {
                    // First note - not selectable
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-muted bg-muted/50"
                      >
                        <span className="text-xl font-bold text-muted-foreground">1</span>
                      </div>
                    );
                  }

                  const isSelected = currentGuess === index;
                  const showAsCorrect = isCorrect && isSelected;
                  const showAsWrong = isCorrect === false && isSelected;

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
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
                        {index + 1}
                      </Button>
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
