import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { stopSounds, MidiNoteNumber, SemitoneOffset, playSequence, semitonesToInterval } from "@/utils/audio";
import { ConfigData } from "@/config/ConfigData";

interface IntervalComparisonPracticeProps {
  settings: ConfigData;
  rootMidi: MidiNoteNumber;
  noteDuration: number;
  noteGap: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isPlayingReference: boolean;
  correctAttempts: number;
  setCorrectAttempts: (count: number) => void;
  totalAttempts: number;
  setTotalAttempts: (count: number) => void;
  elapsedSeconds: number;
  setElapsedSeconds: (seconds: number) => void;
  totalSequencesAnswered: React.MutableRefObject<number>;
  handlePlayAgain: () => void;
  handlePlayReference: () => void;
}

export function IntervalComparisonPractice({
  settings,
  rootMidi,
  noteDuration,
  noteGap,
  isPlaying,
  setIsPlaying,
  isPlayingReference,
  correctAttempts,
  setCorrectAttempts,
  totalAttempts,
  setTotalAttempts,
  elapsedSeconds,
  setElapsedSeconds,
  totalSequencesAnswered,
  handlePlayAgain,
  handlePlayReference,
}: IntervalComparisonPracticeProps) {
  const sequenceItems = useRef<Array<{ note: number; duration: number; gapAfter: number }>>([]);
  const [differentIntervalIndex, setDifferentIntervalIndex] = useState<number>(0);
  const [differentInterval, setDifferentInterval] = useState<SemitoneOffset>(0);
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const sequenceLength = 5; // Total number of intervals to play

  useEffect(() => {
    startNewRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Next button shortcuts
      if ((e.key === 'n' || e.key === 'Enter') && answered) {
        e.preventDefault();
        startNewRound();
        return;
      }

      // Play again shortcut
      if (e.key === 'a' && !isPlaying) {
        e.preventDefault();
        handlePlayAgain();
        return;
      }

      // Reference shortcut
      if (e.key === 'e' && !isPlaying && !isPlayingReference) {
        e.preventDefault();
        handlePlayReference();
        return;
      }

      // Number keys for selecting interval
      if (!answered && e.key >= '1' && e.key <= String(sequenceLength)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        handleIntervalSelection(index);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [answered, isPlaying, isPlayingReference]);

  const generateRandomTempo = () => {
    // Random tempo variation for this sequence
    const tempoVariation = 0.8 + Math.random() * 0.4; // 80% to 120% of base tempo
    return noteDuration * tempoVariation;
  };

  const playSequenceWithDelay = async () => {
    stopSounds();
    setIsPlaying(true);
    console.debug('Playing interval comparison sequence:', sequenceItems.current);
    
    await playSequence(sequenceItems.current);
    
    setIsPlaying(false);
  };

  const startNewRound = () => {
    // Pick which interval will be different
    const diffIndex = Math.floor(Math.random() * sequenceLength);
    setDifferentIntervalIndex(diffIndex);
    
    // Pick whether ascending or descending
    const ascending = Math.random() > 0.5;
    setIsAscending(ascending);
    
    // Pick which of the two comparison intervals is the different one
    const interval1 = settings.comparisonIntervals[0];
    const interval2 = settings.comparisonIntervals[1];
    const mainInterval = Math.random() > 0.5 ? interval1 : interval2;
    const diffInterval = mainInterval === interval1 ? interval2 : interval1;
    setDifferentInterval(diffInterval);
    
    // Generate random starting note within a reasonable range
    const startingNote = rootMidi + Math.floor(Math.random() * 13) - 6; // ±6 semitones from root
    
    // Build sequence
    const items: Array<{ note: number; duration: number; gapAfter: number }> = [];
    let currentNote = startingNote;
    const tempo = generateRandomTempo();
    
    for (let i = 0; i < sequenceLength; i++) {
      items.push({
        note: currentNote,
        duration: tempo,
        gapAfter: noteGap
      });
      
      const intervalToUse = i === diffIndex ? diffInterval : mainInterval;
      currentNote += ascending ? intervalToUse : -intervalToUse;
    }
    
    // Add the final note
    items.push({
      note: currentNote,
      duration: tempo,
      gapAfter: 0
    });
    
    sequenceItems.current = items;
    
    setAnswered(false);
    setSelectedIndex(null);
    setQuestionStartTime(Date.now());
    playSequenceWithDelay();
  };

  const handleIntervalSelection = (index: number) => {
    if (answered) return;

    setSelectedIndex(index);
    setTotalAttempts(totalAttempts + 1);

    const isCorrect = index === differentIntervalIndex;

    if (isCorrect) {
      setCorrectAttempts(correctAttempts + 1);
    }

    setAnswered(true);
    totalSequencesAnswered.current += 1;

    if (Date.now() - questionStartTime > 60000) {
      console.log("Ignoring time spent on this question as user probably stepped away from the app");
    } else {
      setElapsedSeconds(elapsedSeconds + (Math.floor((Date.now() - questionStartTime) / 1000)));
    }
  };

  const getIntervalLabel = (index: number) => {
    if (!answered) return `${index + 1}`;
    
    const isCorrect = index === differentIntervalIndex;
    const isSelected = index === selectedIndex;
    
    if (isCorrect) {
      return `${index + 1} ✓`;
    }
    if (isSelected && !isCorrect) {
      return `${index + 1} ✗`;
    }
    return `${index + 1}`;
  };

  const getIntervalClass = (index: number) => {
    if (!answered) return "bg-primary hover:bg-primary/80";
    
    const isCorrect = index === differentIntervalIndex;
    const isSelected = index === selectedIndex;
    
    if (isCorrect) {
      return "bg-success";
    }
    if (isSelected && !isCorrect) {
      return "bg-destructive";
    }
    return "bg-muted";
  };

  const mainInterval = settings.comparisonIntervals[0] === differentInterval 
    ? settings.comparisonIntervals[1] 
    : settings.comparisonIntervals[0];

  return (
    <>
      <Card className="relative">
        <CardHeader>
          <CardTitle className="text-center">
            {isPlayingReference ? (
              <span className="text-primary animate-pulse">🎵 Playing reference...</span>
            ) : answered ? (
              <span className="text-lg">
                The different interval was {isAscending ? "ascending" : "descending"} {semitonesToInterval(differentInterval)} 
                (among {semitonesToInterval(mainInterval)}s)
              </span>
            ) : (
              <span className="text-lg">
                Which {isAscending ? "ascending" : "descending"} interval is different?
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 justify-center flex-wrap mb-4">
            {Array.from({ length: sequenceLength }).map((_, index) => (
              <Button
                key={index}
                onClick={() => handleIntervalSelection(index)}
                disabled={answered}
                className={`w-16 h-16 text-lg font-bold ${getIntervalClass(index)}`}
                variant={answered ? "outline" : "default"}
              >
                {getIntervalLabel(index)}
              </Button>
            ))}
          </div>
          
          {!answered && (
            <p className="text-sm text-muted-foreground text-center">
              Listen for the interval that sounds different from the others
            </p>
          )}
          
          {answered && (
            <div className="mt-4 flex items-center justify-center gap-3">
              {selectedIndex === differentIntervalIndex ? (
                <span className="text-lg font-semibold text-success">Correct! 🎉</span>
              ) : (
                <span className="text-lg font-semibold text-destructive">Not quite</span>
              )}
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

      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Exercise:</strong> Interval Comparison</p>
            <p><strong>Comparing:</strong> {semitonesToInterval(settings.comparisonIntervals[0])} vs {semitonesToInterval(settings.comparisonIntervals[1])}</p>
            <p><strong>Direction:</strong> {isAscending ? "Ascending" : "Descending"}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
