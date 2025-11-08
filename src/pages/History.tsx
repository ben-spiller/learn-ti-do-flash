import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings } from "lucide-react";
import { semitonesToSolfege, semitonesToInterval } from "@/utils/audio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getNoteButtonColor, getScoreColor, getOctaveIndicator } from "@/utils/noteStyles";
import { ConfigData } from "@/config/ConfigData";

export const STORED_FREQUENTLY_WRONG_2_NOTE_SEQUENCES = "wrong2NoteSequences"
/** Notes that are confused for each other (in either direction) */
export const STORED_FREQUENTLY_CONFUSED_PAIRS = "wrongConfusedPairs"

export const STORED_NEEDS_PRACTICE_SEQUENCES = "needsPracticeNotePairs:"

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
      const stored = localStorage.getItem(STORED_FREQUENTLY_WRONG_2_NOTE_SEQUENCES);
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
      const stored = localStorage.getItem(STORED_NEEDS_PRACTICE_SEQUENCES + exerciseKey);
      return stored ? new Map(JSON.parse(stored)) : new Map();
    } catch (error) {
      console.error('Error reading needs practice data:', error);
      return new Map();
    }
  };

  const allSessions = getAllSessions();
  const recentSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;
  
  // Get unique exercise keys (sorted alphabetically)
  const exerciseKeys = Array.from(new Set(allSessions.map(s => s.exerciseName))).sort();
  
  // Default tab to most recent exercise
  const [selectedTab, setSelectedTab] = useState(recentSession?.exerciseName || exerciseKeys[0] || "");
  
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
    .slice(0, 10); // Show top 10

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className={`text-3xl font-bold ${getScoreColor(recentSession.score)}`}>{recentSession.score}%</div>
              <div className="text-sm text-muted-foreground mt-1">Score</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{(recentSession.totalSeconds/60)?.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Minutes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{recentSession.avgSecsPerAnswer?.toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground mt-1">Avg per Answer</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{recentSession.needsPracticeCount}</div>
              <div className="text-sm text-muted-foreground mt-1">Needs Practice</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {recentSession.correctAttempts} correct out of {recentSession.totalAttempts} attempts
          </div>
        </CardContent>
      </Card>

      {/* Wrong Answers Visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Frequent wrong sequences (latest session)</CardTitle>
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
                      <span className="text-xs text-muted-foreground ml-1">
                        ({pair.prevNoteValue !== null ? semitonesToInterval(pair.noteValue - pair.prevNoteValue) : 'N/A'})
                      </span>
                    </div>
                    <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500/70 to-red-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {widthPercent > 15 && (
                          <span className="text-xs font-bold text-white">{pair.count}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground w-20 text-right flex-shrink-0">{pair.count} wrong</span>
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
                  } catch {
                    return null;
                  }
                })
                .filter((pair): pair is NonNullable<typeof pair> => pair !== null)
                .filter(pair => pair.count > 1) // Only show patterns (count > 1)
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
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
                      <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500/70 to-orange-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${widthPercent}%` }}
                        >
                          {widthPercent > 15 && (
                            <span className="text-xs font-bold text-white">{pair.count}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground w-20 text-right flex-shrink-0">{pair.count} times</span>
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
            .filter(pair => pair.count > 1) // Only show patterns (count > 1)
            .sort((a, b) => b.count - a.count);

          const maxCount = needsPracticePairs[0]?.count || 1;

          return (
            <TabsContent key={exerciseKey} value={exerciseKey} className="space-y-6">
              {/* Needs Practice Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Sequences needing more practice</CardTitle>
                </CardHeader>
                <CardContent>
                  {needsPracticePairs.length > 0 ? (
                    <div className="space-y-3">
                      {needsPracticePairs.map((pair) => {
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
                                {widthPercent > 15 && (
                                  <span className="text-xs font-bold text-white">{pair.count}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground w-20 text-right flex-shrink-0">
                              {pair.count} severity
                            </span>
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

              {/* All Sessions for this Exercise */}
              <Card>
                <CardHeader>
                  <CardTitle>Session history</CardTitle>
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
                          <th className="text-right p-2 text-sm font-medium text-muted-foreground">Needs Practice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exerciseSessions.slice().reverse().map((session, index) => {
                          const avgTime = session.avgSecsPerAnswer?.toFixed(1);
                          const date = new Date(session.sessionDate);
                          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayMonth = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                          const formattedDate = `${dayOfWeek} ${dayMonth}`;
                          
                          // Get previous session (next in reversed array)
                          const previousSession = exerciseSessions.slice().reverse()[index + 1];
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
                            </tr>
                          );
                        })}
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
