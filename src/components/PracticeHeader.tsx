import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Volume2, VolumeX, Volume1 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getScoreColor } from "@/utils/noteStyles";

interface PracticeHeaderProps {
  correctAttempts: number;
  totalAttempts: number;
  elapsedSeconds: number;
  started: boolean;
  isPreloading: boolean;
  showLoadingIndicator: boolean;
  isPlaying: boolean;
  isPlayingReference: boolean;
  droneType: "none" | "root";
  droneVolume: number;
  onStart: () => void;
  onPlayAgain: () => void;
  onPlayReference: () => void;
  onFinish: () => void;
  onDroneVolumeChange: (value: number[]) => void;
}

export const PracticeHeader = ({
  correctAttempts,
  totalAttempts,
  elapsedSeconds,
  started,
  isPreloading,
  showLoadingIndicator,
  isPlaying,
  isPlayingReference,
  droneType,
  droneVolume,
  onStart,
  onPlayAgain,
  onPlayReference,
  onFinish,
  onDroneVolumeChange,
}: PracticeHeaderProps) => {
  const scorePercent = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (droneVolume <= -20) return <VolumeX className="h-4 w-4" />;
    if (droneVolume <= -10) return <Volume1 className="h-4 w-4" />;
    return <Volume2 className="h-4 w-4" />;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Practice Session</CardTitle>
          {started && (
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onPlayAgain}
                      disabled={isPlaying || isPlayingReference}
                    >
                      <Play className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Play Again (A)</span>
                      <span className="ml-1 sm:hidden">Again</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Replay the sequence (keyboard shortcut: A)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onPlayReference}
                      disabled={isPlaying || isPlayingReference}
                    >
                      <Play className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Reference (E)</span>
                      <span className="ml-1 sm:hidden">Ref</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play root note or arpeggio (keyboard shortcut: E)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {droneType !== "none" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {getVolumeIcon()}
                      <span className="ml-1 hidden sm:inline">Drone</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Drone Volume</h4>
                      <Slider
                        value={[droneVolume]}
                        onValueChange={onDroneVolumeChange}
                        min={-30}
                        max={0}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        {droneVolume} dB
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <Button variant="outline" size="sm" onClick={onFinish}>
                Finish
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!started ? (
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={onStart}
              disabled={isPreloading}
              className="w-full max-w-xs"
            >
              {showLoadingIndicator ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Loading...
                </>
              ) : (
                "Start Practice"
              )}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(scorePercent)}`}>
                {scorePercent}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attempts</p>
              <p className="text-2xl font-bold">
                {correctAttempts}/{totalAttempts}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="text-2xl font-bold">{formatTime(elapsedSeconds)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
