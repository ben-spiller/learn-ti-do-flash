import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Volume2, VolumeX, Volume1 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getNeedsPracticeTotalColor, getScoreColor } from "@/utils/noteStyles";
import tuningFork from "@/assets/tuning-fork.svg";

interface PracticeHeaderProps {
  showReference: boolean;
  correctAttempts: number;
  totalAttempts: number;
  needsPracticeTotal?: number;
  elapsedSeconds: number;
  started: boolean;
  isPlaying: boolean;
  isPlayingReference: boolean;
  droneType: "none" | "root";
  droneVolume: number;
  onPlayAgain: () => void;
  onPlayReference: () => void;
  onFinish: () => void;
  onDroneVolumeChange: (value: number[]) => void;
}

export const PracticeHeader = ({
  showReference,
  correctAttempts,
  totalAttempts,
  needsPracticeTotal,
  elapsedSeconds,
  started,
  isPlaying,
  isPlayingReference,
  droneType,
  droneVolume,
  onPlayAgain,
  onPlayReference,
  onFinish,
  onDroneVolumeChange,
}: PracticeHeaderProps) => {
  const scorePercent = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;


  // const getVolumeIcon = () => {
  //   if (droneVolume <= -20) return <VolumeX className="h-4 w-4" />;
  //   if (droneVolume <= -10) return <Volume1 className="h-4 w-4" />;
  //   return <Volume2 className="h-4 w-4" />;
  // };

  return (
     <div className="flex items-center mb-4">
        <div className="flex items-center gap-2">
          {started && (
            <Button
              onClick={onFinish}
              variant="outline"
              size="sm"
            >
              Finish
            </Button>
          )}
        </div>
        <div className="flex items-center" style={{marginLeft: "auto"}}>
          {started && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPlayAgain}
                    disabled={isPlaying}
                  >
                    <Play className="h-4 w-4 mr-1"/>
                    <span className="hidden sm:inline">Again</span>
                  </
                  Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play again (keyboard shortcut: a)</p>
                </TooltipContent>
              </Tooltip>

              {showReference && (              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPlayReference}
                    disabled={isPlaying || isPlayingReference}
                  >
                    <img src={tuningFork} alt="Reference" className="h-4 w-4 mr-0" />
                    <span className="hidden sm:inline">Reference</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play reference for this key (keyboard shortcut: e)</p>
                </TooltipContent>
              </Tooltip>
              )}
              {droneType !== "none" && showReference && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {droneVolume <= -40 ? <VolumeX className="h-5 w-5" /> : 
                       droneVolume <= -20 ? <Volume1 className="h-5 w-5" /> : 
                       <Volume2 className="h-5 w-5" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Drone Volume</div>
                      <Slider
                        value={[droneVolume]}
                        onValueChange={onDroneVolumeChange}
                        min={-30}
                        max={10}
                        step={2}
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        {droneVolume} dB
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <div className="flex gap-3 text-sm ml-2">
                <div className="text-center">
                  <div className={`font-bold text-lg ${getScoreColor(scorePercent)}`}>
                    {scorePercent}%
                  </div>
                  <div className="text-muted-foreground text-xs">Score</div>
                </div>

                {needsPracticeTotal !== undefined && (
                <div className="text-center" title="Practice To-Do size - indicates many correct answers required before each sequence needing more practice is learned">
                  <div className={`font-bold text-lg ${getNeedsPracticeTotalColor(needsPracticeTotal)}`}>
                    {needsPracticeTotal}
                  </div>
                  <div className="text-muted-foreground text-xs">To-Do</div>
                </div>
                )}

                <div className="text-center">
                  <div className="font-bold text-lg">{(elapsedSeconds/60).toFixed(0)}</div>
                  <div className="text-muted-foreground text-xs">Min</div>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

  );
};
