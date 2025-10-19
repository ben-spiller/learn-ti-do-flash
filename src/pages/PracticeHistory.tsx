import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { semitonesToSolfege } from "@/utils/audio";
import { getNoteButtonColor, getScoreColor } from "@/utils/noteStyles";

interface PracticeSession {
  sessionDate: number;
  score: number;
  totalAttempts: number;
  correctAttempts: number;
  elapsedMinutes: number;
  exerciseKey: string;
}

const PracticeHistory = () => {
  const navigate = useNavigate();

  // Get all sessions from localStorage
  const getAllSessions = (): PracticeSession[] => {
    const sessionsStr = localStorage.getItem('practiceSessions');
    if (!sessionsStr) return [];
    return JSON.parse(sessionsStr);
  };

  // Get wrongAnswerHistory from localStorage
  const getWrongAnswerHistory = (exerciseKey: string): Map<string, number> => {
    const stored = localStorage.getItem('wrongAnswerHistory:' + exerciseKey);
    return stored ? new Map(JSON.parse(stored)) : new Map();
  };

  // Get needsPractice from localStorage
  const getNeedsPractice = (exerciseKey: string): Map<string, number> => {
    const stored = localStorage.getItem('needsPracticeNotePairs:' + exerciseKey);
    return stored ? new Map(JSON.parse(stored)) : new Map();
  };

  const allSessions = getAllSessions();
  const recentSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;
  
  // Get unique exercise keys
  const exerciseKeys = Array.from(new Set(allSessions.map(s => s.exerciseKey)));
  
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

  const wrongAnswerHistory = getWrongAnswerHistory(recentSession.exerciseKey);
  const needsPractice = getNeedsPractice(recentSession.exerciseKey);

  // Convert wrongAnswerHistory to sorted array for display
  const wrongAnswerPairs = Array.from(wrongAnswerHistory.entries())
    .map(([pairKey, count]) => {
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
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Show top 10

  const avgTimePerAnswer = recentSession.totalAttempts > 0 
    ? (recentSession.elapsedMinutes * 60 / recentSession.totalAttempts).toFixed(1)
    : '0.0';

  const needsPracticeCount = needsPractice.size;

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 max-w-4xl mx-auto">
      <div className="flex items-center mb-4">
        <Button onClick={() => navigate("/")} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Practice History</h1>

      {/* Recent Session Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Most Recent Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className={`text-3xl font-bold ${getScoreColor(recentSession.score)}`}>{recentSession.score}%</div>
              <div className="text-sm text-muted-foreground mt-1">Score</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{recentSession.elapsedMinutes}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Minutes</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{avgTimePerAnswer}s</div>
              <div className="text-sm text-muted-foreground mt-1">Avg per Answer</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-amber-600">{needsPracticeCount}</div>
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
          <CardTitle>Most Frequent Wrong Answers (Recent Session)</CardTitle>
        </CardHeader>
        <CardContent>
          {wrongAnswerPairs.length > 0 ? (
            <div className="space-y-4">
              {wrongAnswerPairs.map((pair, index) => {
                const maxCount = wrongAnswerPairs[0].count;
                const widthPercent = (pair.count / maxCount) * 100;
                
                return (
                  <div key={pair.pairKey} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{index + 1}.</span>
                        <div className="flex items-center gap-1">
                          {pair.prevNoteValue !== null ? (
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white ${getNoteButtonColor(pair.prevNoteName)}`}>
                              {pair.prevNoteName}
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm bg-muted text-muted-foreground">
                              Start
                            </div>
                          )}
                          <span className="text-muted-foreground px-1">→</span>
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white ${getNoteButtonColor(pair.noteName)}`}>
                            {pair.noteName}
                          </div>
                        </div>
                      </div>
                      <span className="text-muted-foreground">{pair.count} wrong</span>
                    </div>
                    <div className="h-6 bg-muted/30 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500/70 to-red-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {widthPercent > 15 && (
                          <span className="text-xs font-bold text-white">{pair.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No wrong answers yet - you're doing great! 🎉
            </p>
          )}
        </CardContent>
      </Card>

      {/* Needs Practice by Exercise */}
      {exerciseKeys.map(exerciseKey => {
        const needsPracticeForKey = getNeedsPractice(exerciseKey);
        if (needsPracticeForKey.size === 0) return null;

        const needsPracticePairs = Array.from(needsPracticeForKey.entries())
          .map(([pairKey, count]) => {
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
          })
          .sort((a, b) => b.count - a.count);

        return (
          <Card key={exerciseKey} className="mb-6">
            <CardHeader>
              <CardTitle>Needs Practice - {exerciseKey}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsPracticePairs.map((pair) => (
                  <div key={pair.pairKey} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1">
                      {pair.prevNoteValue !== null ? (
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white ${getNoteButtonColor(pair.prevNoteName)}`}>
                          {pair.prevNoteName}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm bg-muted text-muted-foreground">
                          Start
                        </div>
                      )}
                      <span className="text-muted-foreground px-1">→</span>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm text-white ${getNoteButtonColor(pair.noteName)}`}>
                        {pair.noteName}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {pair.count} {pair.count === 1 ? 'error' : 'errors'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* All Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Practice Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Exercise</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Score</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Time (min)</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Avg/Answer</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {allSessions.slice().reverse().map((session, index) => {
                  const avgTime = session.totalAttempts > 0 
                    ? (session.elapsedMinutes * 60 / session.totalAttempts).toFixed(1)
                    : '0.0';
                  const date = new Date(session.sessionDate).toLocaleDateString();
                  
                  return (
                    <tr key={index} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 text-sm">{date}</td>
                      <td className="p-2 text-sm text-muted-foreground">{session.exerciseKey}</td>
                      <td className={`p-2 text-sm text-right font-bold ${getScoreColor(session.score)}`}>
                        {session.score}%
                      </td>
                      <td className="p-2 text-sm text-right">{session.elapsedMinutes}</td>
                      <td className="p-2 text-sm text-right text-muted-foreground">{avgTime}s</td>
                      <td className="p-2 text-sm text-right text-muted-foreground">
                        {session.correctAttempts}/{session.totalAttempts}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticeHistory;
