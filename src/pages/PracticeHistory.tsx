import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { semitonesToSolfege } from "@/utils/audio";

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

  // Get the most recent session from localStorage
  const getRecentSession = (): PracticeSession | null => {
    const sessionsStr = localStorage.getItem('practiceSessions');
    if (!sessionsStr) return null;
    const sessions: PracticeSession[] = JSON.parse(sessionsStr);
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
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

  const recentSession = getRecentSession();
  
  if (!recentSession) {
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
      return {
        pairKey,
        prevNoteName,
        noteName,
        count,
        display: prevNote === '' ? `Start → ${noteName}` : `${prevNoteName} → ${noteName}`
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
              <div className="text-3xl font-bold text-primary">{recentSession.score}%</div>
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
      <Card>
        <CardHeader>
          <CardTitle>Most Frequent Wrong Answers</CardTitle>
        </CardHeader>
        <CardContent>
          {wrongAnswerPairs.length > 0 ? (
            <div className="space-y-3">
              {wrongAnswerPairs.map((pair, index) => {
                const maxCount = wrongAnswerPairs[0].count;
                const widthPercent = (pair.count / maxCount) * 100;
                
                return (
                  <div key={pair.pairKey} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {index + 1}. {pair.display}
                      </span>
                      <span className="text-muted-foreground">{pair.count} wrong</span>
                    </div>
                    <div className="h-8 bg-muted/30 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500/70 to-red-600/70 transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {widthPercent > 20 && (
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
    </div>
  );
};

export default PracticeHistory;
