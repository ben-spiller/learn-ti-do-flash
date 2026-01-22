import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings } from "lucide-react";
import { ClearHistoryButton } from "@/components/ClearHistoryButton";
import { semitonesToSolfege, semitonesToInterval } from "@/utils/audio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getNoteButtonColor, getScoreColor, getOctaveIndicator, getNeedsPracticeTotalColor } from "@/utils/noteStyles";
import { ConfigData, exerciseIsTonal, ExerciseType } from "@/config/ConfigData";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

export const STORED_FREQUENTLY_WRONG_PAIRS = "wrong2NoteSequences"
/** Notes that are confused for each other (in either direction) */
export const STORED_FREQUENTLY_CONFUSED_PAIRS = "wrongConfusedPairs"
/** Intervals that are confused for each other in interval comparison exercises */
export const STORED_CONFUSED_INTERVALS = "confusedIntervals"

export const STORED_NEEDS_PRACTICE_PAIRS = "needsPracticeNotePairs:"

export interface SessionHistory {
  sessionDate: number;
  
  score: number;
  totalAttempts: number;
  correctAttempts: number;

  avgSecsPerAnswer: number;
  totalSeconds: number;

  needsPracticeCount: number;
  needsPracticeTotalSeverity: number;

  exerciseName: string;
  settings: ConfigData;
  
  /** Per-interval scores for IntervalComparison exercises: Map<interval, {correct, total}> */
  intervalScores?: Record<number, { correct: number; total: number }>;
}

const PracticeHistory = () => {
  const navigate = useNavigate();
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

  // Get all sessions from localStorage with error handling
  const getAllSessions = (): SessionHistory[] => {
    try {
      const sessionsStr = localStorage.getItem('practiceSessions');
      if (!sessionsStr) return [];
      
      const allSessions = JSON.parse(sessionsStr);
      
      // Filter out any malformed sessions
      const validSessions = allSessions.filter((session: any) => {
        try {
          // Validate essential fields exist
          
          // Calling this method should hopefully make it throw if something has changed
          ConfigData.getSettingsChanges(session.settings, new ConfigData());
          
          return (
            typeof session.sessionDate === 'number' &&
            typeof session.score === 'number' &&
            typeof session.totalAttempts === 'number' &&
            typeof session.exerciseName === 'string'
          );
        } catch (e) {
          console.warn('Invalid session data found and will be skipped:', session, e);
          return false;
        }
      });
      
      // If we filtered out any sessions, update localStorage
      if (validSessions.length !== allSessions.length) {
        //localStorage.setItem('practiceSessions', JSON.stringify(validSessions));
      }
      
      return validSessions;
    } catch (error) {
      console.error('Error reading practice sessions:', error);
      alert(`Error reading practice sessions: ${error}`);
      return [];
    }
  };

  // Get wrongAnswerHistory from localStorage with error handling
  const getWrongAnswerHistory = (exerciseKey: string): Map<string, number> => {
    try {
      const stored = localStorage.getItem(STORED_FREQUENTLY_WRONG_PAIRS);
      return stored ? new Map(JSON.parse(stored)) : new Map();
    } catch (error) {
      console.error('Error reading wrong answer history:', error);
      return new Map();
    }
  };

  // Get confusedPairs from localStorage with error handling
  const getConfusedPairs = (): Map<string, number> => {
    try {
      const stored = localStorage.getItem(STORED_FREQUENTLY_CONFUSED_PAIRS);
      return stored ? new Map(JSON.parse(stored)) : new Map();
    } catch (error) {
      console.error('Error reading confused pairs:', error);
      return new Map();
    }
  };

  // Get needsPractice from localStorage with error handling
  const getNeedsPractice = (exerciseKey: string): Map<string, number> => {
    try {
      const stored = localStorage.getItem(STORED_NEEDS_PRACTICE_PAIRS + exerciseKey);
      return stored ? new Map(JSON.parse(stored)) : new Map();
    } catch (error) {
      console.error('Error reading practice backlog data:', error);
      return new Map();
    }
  };

  // Get confused intervals from localStorage for interval comparison exercises
  const getConfusedIntervals = (): Map<string, number> => {
    try {
      const stored = localStorage.getItem(STORED_CONFUSED_INTERVALS);
      return stored ? new Map(JSON.parse(stored)) : new Map();
    } catch (error) {
      console.error('Error reading confused intervals:', error);
      return new Map();
    }
  };

  const allSessions = getAllSessions();
  const recentSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;
  
  // Find previous session of the same exercise type (if any)
  // For interval comparison, compare based on overlap of intervalsToFind
  const previousSession = recentSession 
    ? allSessions.filter(s => s.exerciseName === recentSession.exerciseName)
    .filter(s => s.exerciseName !== ExerciseType.IntervalComparison 
      || s.settings.intervalsToFind?.some(i => recentSession.settings.intervalsToFind?.includes(i)))
    .slice(-2)[0] 
    : null;
  const hasPreviousSession = previousSession && previousSession !== recentSession;
  
  // Get unique exercise keys (sorted alphabetically)
  const exerciseKeys = Array.from(new Set(allSessions.map(s => s.exerciseName))).sort();
  
  // Default tab to most recent exercise
  const [selectedTab, setSelectedTab] = useState(recentSession?.exerciseName || exerciseKeys[0] || "");
  
  // Helper to format delta values
  const formatDelta = (current: number, previous: number, suffix: string = '', lowerIsBetter: boolean = false, decimals: number = 0) => {
    const delta = current - previous;
    if (delta === 0) return null;
    const isPositive = lowerIsBetter ? delta < 0 : delta > 0;
    const sign = delta > 0 ? '+' : '';
    const formattedDelta = decimals > 0 ? delta.toFixed(decimals) : Math.round(delta);
    return (
      <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {sign}{formattedDelta}{suffix}
      </span>
    );
  };
  
  if (allSessions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-4 max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <Button onClick={() => navigate("/")} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Practice History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No practice sessions yet. Start practicing to see your history!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const wrongAnswerHistory = getWrongAnswerHistory(recentSession.exerciseName);
  const confusedPairs = getConfusedPairs();

  // Convert wrongAnswerHistory to sorted array for display with error handling
  const wrongAnswerPairs = Array.from(wrongAnswerHistory.entries())
    .map(([pairKey, count]) => {
      try {
        const [prevNote, note] = pairKey.split(',');
        const prevNoteName = prevNote === '' ? 'Start' : semitonesToSolfege(parseInt(prevNote));
        const noteName = semitonesToSolfege(parseInt(note));
        const prevNoteValue = prevNote === '' ? null : parseInt(prevNote);
        const noteValue = parseInt(note);
        return {
          pairKey,
          prevNoteName,
          noteName,
          prevNoteValue,
          noteValue,
          count,
        };
      } catch {
        return null;
      }
    })
    .filter((pair): pair is NonNullable<typeof pair> => pair !== null)
    .filter(pair => pair.count > 1) // Only show patterns (count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Show top items

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 max-w-4xl mx-auto">
      <div className="flex items-center mb-4">
        <Button onClick={() => navigate("/")} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Practice History</h1>

      {/* Recent Session Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Latest session results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            {recentSession.exerciseName !== ExerciseType.IntervalComparison &&
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{recentSession.needsPracticeTotalSeverity}</div>
              {hasPreviousSession && (
                <div className="mt-0.5">{formatDelta(recentSession.needsPracticeTotalSeverity, previousSession.needsPracticeTotalSeverity, '', true)}</div>
              )}
              <div className="text-sm text-muted-foreground mt-1" title="Number of correct answers required to fix the pairs that need practice">To-Do practice backlog</div>
            </div>}

            {recentSession.exerciseName !== ExerciseType.IntervalComparison &&
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{recentSession.needsPracticeCount}</div>
              {hasPreviousSession && (
                <div className="mt-0.5">{formatDelta(recentSession.needsPracticeCount, previousSession.needsPracticeCount, '', true)}</div>
              )}
              <div className="text-sm text-muted-foreground mt-1">Note pairs needing more practice</div>
            </div>}

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className={`text-3xl font-bold ${getScoreColor(recentSession.score)}`}>{recentSession.score}%</div>
              {hasPreviousSession && (
                <div className="mt-0.5">{formatDelta(recentSession.score, previousSession.score, '%')}</div>
              )}
              <div className="text-sm text-muted-foreground mt-1">Score</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{(recentSession.totalSeconds/60)?.toFixed(0)}</div>
              {hasPreviousSession && (
                <div className="mt-0.5">{formatDelta(recentSession.totalSeconds/60, previousSession.totalSeconds/60, 'm', false, 0)}</div>
              )}
              <div className="text-sm text-muted-foreground mt-1">Total Minutes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{recentSession.avgSecsPerAnswer?.toFixed(1)}s</div>
              {hasPreviousSession && (
                <div className="mt-0.5">{formatDelta(recentSession.avgSecsPerAnswer, previousSession.avgSecsPerAnswer, 's', true, 1)}</div>
              )}
              <div className="text-sm text-muted-foreground mt-1">Avg per Answer</div>
            </div>


          </div>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {recentSession.correctAttempts} correct out of {recentSession.totalAttempts} attempts
          </div>
          {recentSession.score < 70 && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-base font-medium text-foreground text-center">
                💡 Based on this score you might make faster progress with a simpler or more focused exercise. 
                Focus on the specific intervals and note pairs that you find most challenging,
                {exerciseIsTonal(recentSession.settings.exerciseType) && recentSession.settings.droneType === "none" ? 
                  " add a drone note to build a tonal mental model for hearing the notes, or try single note practice for a while." : " or reduce the tempo."}
              </p>
            </div>
          )}
          {recentSession.score >= 95 && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-base font-medium text-foreground text-center">
                🎉 Excellent work! This exercise seems too easy for you. 
                Try {exerciseIsTonal(recentSession.settings.exerciseType) && recentSession.settings.droneType !== "none" ? 
                " removing the drone, increasing the number of notes, or expanding the note range." : " increasing the tempo or adding more notes."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confused Intervals Visualization - for Interval Comparison exercises */}
      {recentSession.exerciseName === ExerciseType.IntervalComparison && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Frequently confused intervals (latest session)</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const confusedIntervals = getConfusedIntervals();
              const confusedIntervalsPairs = Array.from(confusedIntervals.entries())
                .map(([pairKey, count]) => {
                  try {
                    const [targetInterval, selectedInterval] = pairKey.split(',').map(n => parseInt(n));
                    return {
                      pairKey,
                      targetInterval,
                      selectedInterval,
                      targetName: semitonesToInterval(targetInterval),
                      selectedName: semitonesToInterval(selectedInterval),
                      count,
                    };
                  } catch {
                    return null;
                  }
                })
                .filter((pair): pair is NonNullable<typeof pair> => pair !== null)
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);
              
              if (confusedIntervalsPairs.length === 0) {
                return (
                  <p className="text-muted-foreground text-center py-8">
                    No confused intervals yet - excellent work! 🎯
                  </p>
                );
              }
              
              const maxCount = confusedIntervalsPairs[0].count;
              
              return (
                <div className="space-y-3">
                  {confusedIntervalsPairs.map((pair, index) => {
                    const widthPercent = (pair.count / maxCount) * 100;
                    
                    return (
                      <div key={pair.pairKey} className="flex items-center gap-3">
                        <span className="font-medium text-muted-foreground w-6">{index + 1}.</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 font-bold text-sm">
                            {pair.targetName}
                          </div>
                          <span className="text-muted-foreground">↔</span>
                          <div className="px-3 py-2 rounded-lg bg-destructive/20 border border-destructive/30 font-bold text-sm" style={{ width: "7em" }}>
                            {pair.selectedName}
                          </div>
                        </div>
                        <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500/70 to-orange-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                            style={{ width: `${widthPercent}%` }}
                          >
                              <span className="text-xs font-bold text-white">{pair.count}{widthPercent>30 && index===0 && ' times'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Wrong Answers Visualization */}
      {recentSession.exerciseName != ExerciseType.IntervalComparison && (<>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Frequent wrong note pairs ({recentSession.exerciseName} - latest session)</CardTitle>
        </CardHeader>
        <CardContent>
          {wrongAnswerPairs.length > 0 ? (
            <div className="space-y-3">
              {wrongAnswerPairs.map((pair, index) => {
                const maxCount = wrongAnswerPairs[0].count;
                const widthPercent = (pair.count / maxCount) * 100;
                
                return (
                  <div key={pair.pairKey} className="flex items-center gap-3">
                    <span className="font-medium text-muted-foreground w-6">{index + 1}.</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {pair.prevNoteValue !== null ? (
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white relative ${getNoteButtonColor(pair.prevNoteName)}`}>
                          {pair.prevNoteName}
                          {getOctaveIndicator(pair.prevNoteValue) && (
                            <span className="absolute top-0.5 right-0.5 text-[10px] font-bold bg-black/30 px-1 rounded">
                              {getOctaveIndicator(pair.prevNoteValue)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm bg-muted text-muted-foreground">
                          Start
                        </div>
                      )}
                      <span className="text-muted-foreground px-1">→</span>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white relative ${getNoteButtonColor(pair.noteName)}`}>
                        {pair.noteName}
                        {getOctaveIndicator(pair.noteValue) && (
                          <span className="absolute top-0.5 right-0.5 text-[10px] font-bold bg-black/30 px-1 rounded">
                            {getOctaveIndicator(pair.noteValue)}
                          </span>
                        )}
                      </div>
                      {recentSession.exerciseName !== ExerciseType.SingleNoteRecognition &&
                        <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                          ({pair.prevNoteValue !== null ? semitonesToInterval(pair.noteValue - pair.prevNoteValue) : 'Start'})
                        </span>
                    }
                    </div>
                    <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500/70 to-red-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="text-xs font-bold text-white">{pair.count}{widthPercent>30 && ' wrong'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No wrong answers yet - well done! 🎉
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confused Pairs Visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Frequently confused notes (latest session)</CardTitle>
        </CardHeader>
        <CardContent>
          {confusedPairs.size > 0 ? (
            <div className="space-y-3">
              {Array.from(confusedPairs.entries())
                .map(([pairKey, count]) => {
                  try {
                    const [note1, note2] = pairKey.split(',').map(n => parseInt(n));
                    const note1Name = semitonesToSolfege(note1);
                    const note2Name = semitonesToSolfege(note2);
                    return {
                      pairKey,
                      note1Name,
                      note2Name,
                      note1Value: note1,
                      note2Value: note2,
                      count,
                    };
                  } catch (e) {
                    console.warn("Confused pairs error: ", e);
                    return null;
                  }
                })
                .filter((pair): pair is NonNullable<typeof pair> => pair !== null)
                .filter(pair => pair.count > 1) // Only show patterns (count > 1)
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((pair, index, arr) => {
                  const maxCount = arr[0].count;
                  const widthPercent = (pair.count / maxCount) * 100;
                  
                  return (
                    <div key={pair.pairKey} className="flex items-center gap-3">
                      <span className="font-medium text-muted-foreground w-6">{index + 1}.</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white relative ${getNoteButtonColor(pair.note1Name)}`}>
                          {pair.note1Name}
                          {getOctaveIndicator(pair.note1Value) && (
                            <span className="absolute top-0.5 right-0.5 text-[10px] font-bold bg-black/30 px-1 rounded">
                              {getOctaveIndicator(pair.note1Value)}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground px-1">↔</span>
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white relative ${getNoteButtonColor(pair.note2Name)}`}>
                          {pair.note2Name}
                          {getOctaveIndicator(pair.note2Value) && (
                            <span className="absolute top-0.5 right-0.5 text-[10px] font-bold bg-black/30 px-1 rounded">
                              {getOctaveIndicator(pair.note2Value)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                        ({Math.abs(pair.note1Value-pair.note2Value)} semitones)
                      </span>
                      <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500/70 to-orange-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${widthPercent}%` }}
                        >
                            <span className="text-xs font-bold text-white">{pair.count} times</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No confused note pairs yet - well done! 🎵
            </p>
          )}
        </CardContent>
      </Card>
      </>)}

      {/* Tabs by Exercise */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          {exerciseKeys.map(key => (
            <TabsTrigger key={key} value={key}>
              {key}
            </TabsTrigger>
          ))}
        </TabsList>

        {exerciseKeys.map(exerciseKey => {
          const needsPracticeForKey = getNeedsPractice(exerciseKey);
          const exerciseSessions = allSessions.filter(s => s.exerciseName === exerciseKey);

          const needsPracticePairs = Array.from(needsPracticeForKey.entries())
            .map(([pairKey, count]) => {
              try {
                const [prevNote, note] = pairKey.split(',');
                const prevNoteName = prevNote === '' ? 'Start' : semitonesToSolfege(parseInt(prevNote));
                const noteName = semitonesToSolfege(parseInt(note));
                const prevNoteValue = prevNote === '' ? null : parseInt(prevNote);
                const noteValue = parseInt(note);
                return {
                  pairKey,
                  prevNoteName,
                  noteName,
                  prevNoteValue,
                  noteValue,
                  count,
                };
              } catch {
                return null;
              }
            })
            .filter((pair): pair is NonNullable<typeof pair> => pair !== null)
            .filter(pair => pair.count > 2) // Only show more common ones
            .sort((a, b) => b.count - a.count);

          const maxCount = needsPracticePairs[0]?.count || 1;

          return (
            <TabsContent key={exerciseKey} value={exerciseKey} className="space-y-6">
              {/* Needs Practice Section */}
              {exerciseKey !== ExerciseType.IntervalComparison && (<>
              <Card>
                <CardHeader>
                  <CardTitle>Note pairs needing more practice</CardTitle>
                </CardHeader>
                <CardContent>
                  {needsPracticePairs.length > 0 ? (
                    <div className="space-y-3">
                      {needsPracticePairs.map((pair, index) => {
                        const widthPercent = (pair.count / maxCount) * 100;
                        
                        return (
                          <div key={pair.pairKey} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {pair.prevNoteValue !== null ? (
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white relative ${getNoteButtonColor(pair.prevNoteName)}`}>
                                  {pair.prevNoteName}
                                  {getOctaveIndicator(pair.prevNoteValue) && (
                                    <span className="absolute top-0.5 right-0.5 text-[10px] font-bold bg-black/30 px-1 rounded">
                                      {getOctaveIndicator(pair.prevNoteValue)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm bg-muted text-muted-foreground">
                                  Start
                                </div>
                              )}
                              <span className="text-muted-foreground px-1">→</span>
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white relative ${getNoteButtonColor(pair.noteName)}`}>
                                {pair.noteName}
                                {getOctaveIndicator(pair.noteValue) && (
                                  <span className="absolute top-0.5 right-0.5 text-[10px] font-bold bg-black/30 px-1 rounded">
                                    {getOctaveIndicator(pair.noteValue)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500/70 to-amber-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                                style={{ width: `${widthPercent}%` }}
                              >
                                  <span className="text-xs font-bold text-white">{pair.count}{widthPercent>30 && index == 0 && ' severity'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No intervals need practice - excellent work! 🌟
                    </p>
                  )}
                </CardContent>
              </Card>
              </>)}

              {/* Progress Charts */}
              {exerciseSessions.length > 1 && exerciseKey === ExerciseType.IntervalComparison && (
                <Card>
                  <CardHeader>
                    <CardTitle>Score % by interval to find</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          // Build chart data using intervalScores from each session
                          // Each session can have scores for multiple intervals
                          type ChartPoint = {
                            idx: number;
                            date: string;
                            [key: number]: number; // interval -> score %
                          };
                          
                          const chartData: ChartPoint[] = [];
                          const allIntervals = new Set<number>();
                          
                          exerciseSessions.forEach((session, idx) => {
                            const dataPoint: ChartPoint = {
                              idx,
                              date: format(new Date(session.sessionDate), 'dd/MM HH:mm'),
                            };
                            
                            // Use intervalScores if available, otherwise fall back to session score for all configured intervals
                            if (session.intervalScores) {
                              Object.entries(session.intervalScores).forEach(([intervalStr, scores]) => {
                                const interval = parseInt(intervalStr);
                                if (scores.total > 0) {
                                  dataPoint[interval] = Math.round((scores.correct / scores.total) * 100);
                                  allIntervals.add(interval);
                                }
                              });
                            } else if (session.settings.intervalsToFind?.length === 1) {
                              // Legacy: single interval sessions without intervalScores
                              const interval = session.settings.intervalsToFind[0];
                              dataPoint[interval] = session.score;
                              allIntervals.add(interval);
                            }
                            
                            chartData.push(dataPoint);
                          });
                          
                          const intervals = [...allIntervals].sort((a, b) => a - b);
                          const colors = ['#7c3aed', '#f59e0b', '#16a34a', '#0891b2', '#c026d3', '#dc2626', '#2563eb', '#84cc16'];
                          
                          // Get the intervals from the latest session
                          const latestIntervals = exerciseSessions[exerciseSessions.length - 1]?.settings.intervalsToFind || [];
                          
                          return (
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 65%)" />
                              <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(240, 5%, 65%)' }} />
                              <YAxis domain={[0, 100]} tick={{ fill: 'hsl(240, 5%, 65%)' }} />
                              <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(240, 10%, 13%)', border: '1px solid hsl(240, 4%, 16%)', color: 'hsl(0, 0%, 98%)' }} />
                              <Legend />
                              {intervals.map((interval, idx) => {
                                const isLatest = latestIntervals.includes(interval as any);
                                return (
                                  <Line
                                    key={`line-${interval}`}
                                    type="monotone"
                                    dataKey={interval}
                                    name={isLatest ? `★${semitonesToInterval(interval)}★` : semitonesToInterval(interval)}
                                    stroke={colors[idx % colors.length]}
                                    strokeWidth={isLatest ? 5 : 2}
                                    dot={{ r: isLatest ? 2 : 1, strokeWidth: 1 }}
                                    connectNulls
                                  />
                                );
                              })}
                            </LineChart>
                          );
                        })()}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {exerciseSessions.length > 1 && exerciseKey !== ExerciseType.IntervalComparison && (
                <>

                  <Card>
                    <CardHeader>
                      <CardTitle>Practice To-Do size</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const chartData = exerciseSessions.map((session, idx) => ({
                              idx,
                              date: format(new Date(session.sessionDate), 'dd/MM HH:mm'),
                              severity: session.needsPracticeTotalSeverity || 0,
                            }));
                            
                            return (
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 65%)" />
                                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(240, 5%, 65%)' }} />
                                <YAxis tick={{ fill: 'hsl(240, 5%, 65%)' }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(240, 10%, 13%)', border: '1px solid hsl(240, 4%, 16%)', color: 'hsl(0, 0%, 98%)' }} />
                                <Line
                                  type="monotone"
                                  dataKey="severity"
                                  name="Practice To-Do's"
                                  stroke="red"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                />
                              </LineChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Score %</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          {(() => {
                            const chartData = exerciseSessions.map((session, idx) => ({
                              idx,
                              date: format(new Date(session.sessionDate), 'dd/MM HH:mm'),
                              score: session.score,
                            }));
                            
                            return (
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 65%)" />
                                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(240, 5%, 65%)' }} />
                                <YAxis domain={[0, 100]} tick={{ fill: 'hsl(240, 5%, 65%)' }} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(240, 10%, 13%)', border: '1px solid hsl(240, 4%, 16%)', color: 'hsl(0, 0%, 98%)' }} />
                                <Line
                                  type="monotone"
                                  dataKey="score"
                                  name="Score %"
                                  stroke="lightgreen"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                />
                              </LineChart>
                            );
                          })()}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                </>
              )}

              {/* All Sessions for this Exercise */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Session history</CardTitle>
                  <ClearHistoryButton exerciseKey={exerciseKey} sessionCount={exerciseSessions.length} />
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-medium text-muted-foreground">Date</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Score</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Time (min)</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Avg/Answer</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Attempts</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Needs practice</th>
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Practice To-Do's</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const reversedSessions = exerciseSessions.slice().reverse();
                          const recentSessions = reversedSessions.slice(0, 10);
                          const olderSessions = reversedSessions.slice(10);
                          
                          // Group older sessions by week
                          const weekGroups = new Map<string, SessionHistory[]>();
                          olderSessions.forEach(session => {
                            const sessionDate = new Date(session.sessionDate);
                            const weekStart = startOfWeek(sessionDate, { weekStartsOn: 1 }); // Monday
                            const weekKey = format(weekStart, 'yyyy-MM-dd');
                            
                            if (!weekGroups.has(weekKey)) {
                              weekGroups.set(weekKey, []);
                            }
                            weekGroups.get(weekKey)!.push(session);
                          });
                          
                          const weekGroupsArray = Array.from(weekGroups.entries()).map(([weekKey, sessions]) => {
                            const weekStart = new Date(weekKey);
                            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                            const avgScore = Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length);
                            const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.totalSeconds, 0) / 60);
                            const totalAttempts = sessions.reduce((sum, s) => sum + s.totalAttempts, 0);
                            const totalCorrect = sessions.reduce((sum, s) => sum + s.correctAttempts, 0);
                            const totalNeedsPractice = Math.round(sessions.reduce((sum, s) => sum + s.needsPracticeCount, 0)/ sessions.length);
                            const totalSeverity = Math.round(sessions.reduce((sum, s) => sum + s.needsPracticeTotalSeverity, 0)/ sessions.length);
                            
                            return {
                              weekKey,
                              weekStart,
                              weekEnd,
                              sessions,
                              avgScore,
                              totalMinutes,
                              totalAttempts,
                              totalCorrect,
                              totalNeedsPractice,
                              totalSeverity,
                            };
                          });
                          
                          return (
                            <>
                              {/* Recent 10 sessions - detailed */}
                              {recentSessions.map((session, index) => {
                                const avgTime = session.avgSecsPerAnswer?.toFixed(1);
                                const date = new Date(session.sessionDate);
                                const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
                                const dayMonth = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                                const formattedDate = `${dayOfWeek} ${dayMonth}`;
                                
                                // Get previous session (next in reversed array)
                                const previousSession = reversedSessions[index + 1];
                                const settingsChanges = ConfigData.getSettingsChanges(session.settings, previousSession?.settings);
                                const tooltipId = `tooltip-${exerciseKey}-${index}`;
                                
                                return (
                                  <tr key={index} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="p-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        {formattedDate}
                                        {settingsChanges.length > 0 && (
                                          <TooltipProvider>
                                            <Tooltip open={openTooltip === tooltipId} onOpenChange={(open) => setOpenTooltip(open ? tooltipId : null)}>
                                              <TooltipTrigger asChild>
                                                <button
                                                  onClick={() => setOpenTooltip(openTooltip === tooltipId ? null : tooltipId)}
                                                  onMouseEnter={() => setOpenTooltip(tooltipId)}
                                                  onMouseLeave={() => setOpenTooltip(null)}
                                                  className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                                >
                                                  <Settings className="h-3.5 w-3.5 text-blue-500" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent side="right" className="max-w-xs">
                                                <div className="text-xs space-y-1">
                                                  <div className="font-semibold mb-1">Settings changed:</div>
                                                  {settingsChanges.map((change, i) => (
                                                    <div key={i}>• {change}</div>
                                                  ))}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                    </td>
                                    <td className={`p-2 text-sm text-right font-bold ${getScoreColor(session.score)}`}>
                                      {session.score}%
                                    </td>
                                    <td className="p-2 text-sm text-right">{(session.totalSeconds/60).toFixed(0)}</td>
                                    <td className="p-2 text-sm text-right text-muted-foreground">{avgTime}s</td>
                                    <td className="p-2 text-sm text-right text-muted-foreground">
                                      {session.correctAttempts}/{session.totalAttempts}
                                    </td>
                                    <td className="p-2 text-sm text-right text-amber-600 font-medium">
                                      {session.needsPracticeCount}
                                    </td>
                                    <td className={`p-2 text-sm text-right ${getNeedsPracticeTotalColor(session.needsPracticeTotalSeverity)} font-medium`}>
                                      {session.needsPracticeTotalSeverity || 0}
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              {/* Aggregated weeks */}
                              {weekGroupsArray.map((weekGroup) => {
                                const weekLabel = `${format(weekGroup.weekStart, 'dd MMM')} - ${format(weekGroup.weekEnd, 'dd MMM')}`;
                                
                                return (
                                  <tr key={weekGroup.weekKey} className="border-b last:border-0 hover:bg-muted/30 bg-muted/20">
                                    <td className="p-2 text-sm font-medium">
                                      {weekLabel} <span className="text-xs text-muted-foreground">({weekGroup.sessions.length} sessions)</span>
                                    </td>
                                    <td className={`p-2 text-sm text-right font-bold ${getScoreColor(weekGroup.avgScore)}`}>
                                      {weekGroup.avgScore}%
                                    </td>
                                    <td className="p-2 text-sm text-right">{weekGroup.totalMinutes}</td>
                                    <td className="p-2 text-sm text-right text-muted-foreground">-</td>
                                    <td className="p-2 text-sm text-right text-muted-foreground">
                                      {weekGroup.totalCorrect}/{weekGroup.totalAttempts}
                                    </td>
                                    <td className="p-2 text-sm text-right text-amber-600 font-medium">
                                      {weekGroup.totalNeedsPractice}
                                    </td>
                                    <td className="p-2 text-sm text-right text-orange-600 font-medium">
                                      {weekGroup.totalSeverity}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default PracticeHistory;
