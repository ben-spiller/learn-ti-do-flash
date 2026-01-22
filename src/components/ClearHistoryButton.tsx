import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  STORED_NEEDS_PRACTICE_PAIRS, 
  STORED_FREQUENTLY_WRONG_PAIRS, 
  STORED_FREQUENTLY_CONFUSED_PAIRS,
  STORED_CONFUSED_INTERVALS,
  SessionHistory 
} from "@/pages/History";
import { ExerciseType } from "@/config/ConfigData";

interface ClearHistoryButtonProps {
  exerciseKey: string;
  sessionCount: number;
}

export const ClearHistoryButton = ({ exerciseKey, sessionCount }: ClearHistoryButtonProps) => {
  const handleClear = () => {
    // Filter out sessions for this exercise type
    const allSessionsNow = JSON.parse(localStorage.getItem('practiceSessions') || '[]');
    const filteredSessions = allSessionsNow.filter((s: SessionHistory) => s.exerciseName !== exerciseKey);
    localStorage.setItem('practiceSessions', JSON.stringify(filteredSessions));
    
    // Clear related localStorage items
    localStorage.removeItem(STORED_NEEDS_PRACTICE_PAIRS + exerciseKey);
    if (exerciseKey === ExerciseType.IntervalComparison) {
      localStorage.removeItem(STORED_CONFUSED_INTERVALS);
    } else {
      localStorage.removeItem(STORED_FREQUENTLY_WRONG_PAIRS);
      localStorage.removeItem(STORED_FREQUENTLY_CONFUSED_PAIRS);
    }
    
    // Refresh the page to show updated data
    window.location.reload();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear {exerciseKey} history?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all {sessionCount} session{sessionCount !== 1 ? 's' : ''} for "{exerciseKey}". 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleClear}
          >
            Delete All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
