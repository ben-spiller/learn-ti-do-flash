import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { stopSounds, MidiNoteNumber, SemitoneOffset, playNote, playSequence, semitonesToSolfege, semitonesToOneOctave, keypressToSemitones } from "@/utils/audio";
import { ConfigData, ExerciseType } from "@/config/ConfigData";
import { getNoteButtonColor } from "@/utils/noteStyles";
import SolfegeKeyboard from "@/components/SolfegeKeyboard";

interface NoteRecognitionPracticeProps {
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
  wrong2NoteSequences: React.MutableRefObject<Map<string, number>>;
  confusedPairs: React.MutableRefObject<Map<string, number>>;
  needsPractice: React.MutableRefObject<Map<string, number>>;
  handlePlayAgain: () => void;
  handlePlayReference: () => Promise<void>;
  ref: React.Ref<any>;
}

export const NoteRecognitionPractice = forwardRef(function NoteRecognitionPractice({
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
  wrong2NoteSequences,
  confusedPairs,
  needsPractice,
  handlePlayAgain,
  handlePlayReference
}: NoteRecognitionPracticeProps, ref) {
  const prevSequence = useRef<SemitoneOffset[]>([]);
  const [sequence, setSequence] = useState<SemitoneOffset[]>([]);
  const sequenceItems = useRef<Array<{ note: number; duration: number; gapAfter: number }>>([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [lastPressedNote, setLastPressedNote] = useState<SemitoneOffset | null>(null);
  const [lastPressedWasCorrect, setLastPressedWasCorrect] = useState<boolean | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const isQuestionComplete = (): boolean => {
    return currentPosition >= settings.numberOfNotes 
      || (settings.exerciseType === ExerciseType.SingleNoteRecognition && currentPosition >= 1); 
  };

  useImperativeHandle(ref, () => ({
    handlePlayAgain: () => {
      playSequenceWithDelay();
    },
  }));

  useEffect(() => {
    const doStart = async () => {
        await handlePlayReference();
        // Add gap before exercise
        await new Promise(resolve => setTimeout(resolve, 800));
      startNewRound();
    }

    doStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Next button shortcuts
      if ((e.key === 'n' || e.key === 'Enter') && isQuestionComplete()) {
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

      let note = keypressToSemitones(e);
      if (note !== null) {
        e.preventDefault();
        handleNotePress(note);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPosition, settings.numberOfNotes, rootMidi, sequence, isPlaying, isPlayingReference]);

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
    console.debug('Playing sequence:', sequenceItems.current);
    
    await playSequence(sequenceItems.current);
    
    setIsPlaying(false);
  };

  const startNewRound = () => {
    prevSequence.current = [...sequence];
    const newSequence = generateNextNoteSequence();
    setSequence(newSequence as number[]);
    
    const durations = generateSequenceDurations(newSequence.length + settings.playExtraNotes);
    
    const extraNotesOffsets: SemitoneOffset[] = [];
    if (settings.playExtraNotes > 0) {
      const pool = settings.getNotePool();
      
      for (let i = 0; i < settings.playExtraNotes; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        extraNotesOffsets.push(pool[randomIndex]);
      }
    }
    
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
    setQuestionStartTime(Date.now());
    playSequenceWithDelay();
  };

  const handleNotePress = (selectedNote: SemitoneOffset) => {
    if (isQuestionComplete()) {
      stopSounds();
      playNote(selectedNote+rootMidi);
      return;
    }

    const correctNote = sequence[currentPosition];
    setTotalAttempts(totalAttempts + 1);

    const isCorrect = semitonesToOneOctave(selectedNote) === semitonesToOneOctave(correctNote);

    setLastPressedNote(selectedNote);
    setLastPressedWasCorrect(isCorrect);

    const correctInterval = correctNote;
    const prevInterval = currentPosition === 0 ? '' : sequence[currentPosition - 1];
    const pairKey = `${prevInterval},${correctInterval}`;

    if (isCorrect) {
      stopSounds();
      playNote(correctNote+rootMidi);

      const currentCount = needsPractice.current.get(pairKey) || 0;
      if (currentCount > 0) {
        const newCount = currentCount - 1;
        if (newCount <= 0) {
          needsPractice.current.delete(pairKey);
        } else {
          needsPractice.current.set(pairKey, newCount);
        }
      }

      setCorrectAttempts(correctAttempts + 1);
      setCurrentPosition(currentPosition + 1);

      if (isQuestionComplete()) {
        totalSequencesAnswered.current += 1;
        if (Date.now() - questionStartTime > 60000) {
          console.log("Ignoring time spent on this question as user probably stepped away from the app");
        } else {
          setElapsedSeconds(elapsedSeconds + (Math.floor((Date.now() - questionStartTime) / 1000)));
        }
      }

      setTimeout(() => {
        setLastPressedNote(null);
        setLastPressedWasCorrect(null);
      }, 600);
    } else {
      stopSounds();
      playNote(selectedNote+rootMidi);

      wrong2NoteSequences.current.set(pairKey, (wrong2NoteSequences.current.get(pairKey) || 0) + 1);

      const note1 = Math.min(correctInterval, selectedNote);
      const note2 = Math.max(correctInterval, selectedNote);
      const confusedPairKey = `${note1},${note2}`;
      confusedPairs.current.set(confusedPairKey, (confusedPairs.current.get(confusedPairKey) || 0) + 1);

      let needsPracticeCount = (needsPractice.current.get(pairKey) || 0);
      const maxNeedsPractice = 20;
      needsPractice.current.set(pairKey, Math.min(maxNeedsPractice, needsPracticeCount + (
        (needsPracticeCount <3) ? +3 : +1)));
      
      const incorrectPairKey = `${prevInterval},${selectedNote}`;
      const incorrectNeedsPracticeCount = (needsPractice.current.get(incorrectPairKey) || 0);
      needsPractice.current.set(incorrectPairKey, incorrectNeedsPracticeCount + 1);
      
      setTimeout(() => {
        setLastPressedNote(null);
        setLastPressedWasCorrect(null);
      }, 600);
    }
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

  function pickNextNote(pool: SemitoneOffset[], currentSequence: SemitoneOffset[]): [SemitoneOffset, string] {
      pool = [...pool];

      const prevNote = currentSequence.length === 0 ? null : currentSequence[currentSequence.length - 1];

      if (prevNote === null) {
          if (prevSequence.current.length > 0 && pool.length > 1) {
            console.debug("Filtering out previous starting note: "+semitonesToSolfege(prevSequence.current[0]));
            pool = pool.filter(note => note !== prevSequence.current[0]);
          }
      } 
      else {
        let intervalFiltered = pool.filter(note => {
          const distance = Math.abs(note - prevNote);
          return distance >= settings.consecutiveIntervals[0] && distance <= settings.consecutiveIntervals[1]; 
        });

        if (intervalFiltered.length === 0) { console.log("No possible notes after "+semitonesToSolfege(prevNote)); }
        else { pool = intervalFiltered; }
      }

      console.debug("Next note pool after filtering: "+JSON.stringify(pool));

      if (Math.random() < (needsPractice.current.size > 2 ? 0.7 : 0.4)) {
        const practiceNote = pickFromNeedsPractice(pool, prevNote);
        if (practiceNote !== null) {
          console.debug("  picked from needs-practice: "+ semitonesToSolfege(practiceNote));
          return [practiceNote, "needs-practice"];
        }
      }
      return [pool[randomInt(pool.length)], "random"];      
  }

  function pickFromNeedsPractice(pool: SemitoneOffset[], prevNote: SemitoneOffset | null): SemitoneOffset | null {
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

    const totalWeight = validPairs.reduce((sum, [_, count]) => sum + count, 0);
    let random = Math.random() * totalWeight;
    
    for (const [pairKey, count] of validPairs) {
      random -= count;
      if (random <= 0) {
        const [_, storedNote] = pairKey.split(',');
        return parseInt(storedNote);
      }
    }

    const [_, lastNote] = validPairs[validPairs.length - 1][0].split(',');
    return parseInt(lastNote);
  }

  return (
    <>
      <SolfegeKeyboard
        rootMidi={rootMidi}
        onNotePress={handleNotePress}
        overlayNote={lastPressedNote}
        overlayNoteTick={lastPressedWasCorrect}
        disabled={isPlayingReference}
      />

      <Card className="relative">
        <CardHeader>
          <CardTitle className="text-center">
            {isPlayingReference ? (
              <span className="text-primary animate-pulse">🎵 Playing reference...</span>
            ) : (
              "Identify the notes"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>                
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
          {isQuestionComplete() && (
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
  );
});
