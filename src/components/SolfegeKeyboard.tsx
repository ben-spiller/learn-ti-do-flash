import React from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { SemitoneOffset, MAJOR_SCALE_PITCH_CLASSES, semitonesToSolfege } from "@/utils/audio";
import { getNoteButtonColor } from "@/utils/noteStyles";

interface SolfegeKeyboardProps {
  rootMidi: number;
  onNotePress: (note: SemitoneOffset) => void;
  /** If true, show a tick overlay icon, if false a cross, if null then nothing. */
  overlayNoteTick: boolean | null;
  overlayNote: SemitoneOffset | null;
  disabled: boolean;
}

const SolfegeKeyboard: React.FC<SolfegeKeyboardProps> = ({
  rootMidi,
  onNotePress,
  overlayNote = null,
  overlayNoteTick = null,
  disabled = false,
}) => {
  // Shared spacing constants used by both the solfege column and the chromatic column.
  // Units: rem for the layout math, and Tailwind margin classes for the button stack.
  const WIDE_GAP_REM = 1.0; // rem - used for both solfege stack spacing and chromatic math
  const NARROW_GAP_REM = 0.2; // rem - used for smaller spacing

  return (
    <div className="flex gap-2">
      {/* Main (major scale / solfege) notes column */}
      <div className="flex-1 flex flex-col">
        {[...MAJOR_SCALE_PITCH_CLASSES].reverse().map((pitch, index) => {
          let solfege = semitonesToSolfege(pitch, true);
          
          // Calculate gap - wider except between Mi-Fa (natural semitone)
          const nextPitch = [...MAJOR_SCALE_PITCH_CLASSES].reverse()[index + 1];
          const hasChromatic = nextPitch !== undefined && Math.abs(pitch - nextPitch) === 2;
          // use rem-based inline margin so units match the chromatic column math
          const gapStyle = { marginBottom: `${hasChromatic ? WIDE_GAP_REM : NARROW_GAP_REM}rem` } as React.CSSProperties;
          
          const isLastPressed = overlayNote === pitch;
          
          return (
            <div key={pitch} className="relative" style={index < MAJOR_SCALE_PITCH_CLASSES.length - 1 ? gapStyle : undefined}>
              <Button
                onClick={() => onNotePress(pitch)}
                className={`h-16 w-full text-xl font-bold text-white relative ${getNoteButtonColor(semitonesToSolfege(pitch))}`}
                disabled={disabled}
              >
                {solfege}
                {isLastPressed && overlayNoteTick !== null && (
                  <div className={`absolute inset-0 flex items-center justify-center animate-scale-in`}>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                      {overlayNoteTick ? (
                        <Check className="w-8 h-8 text-green-500" strokeWidth={3} />
                      ) : (
                        <X className="w-8 h-8 text-red-500" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                )}
              </Button>
            </div>
          );
        })}
      </div>
      
      {/* Chromatic notes column */}
      <div className="w-24 relative">
        {/* Chromatic notes positioned in gaps */}
        {[10, 8, 6, 3, 1].map((pitch, index) => {
          // Calculate vertical position to center flat button in the gap
          const gapPositions = [0, 1, 2, 4, 5]; // Which gap after button index
          const gapIndex = gapPositions[index];
          
          const buttonHeight = 4; // rem (h-16)
          const flatButtonHeight = 3; // rem (h-12)
          const wideGap = WIDE_GAP_REM; // rem
          const narrowGap = NARROW_GAP_REM; // rem
          
          // Calculate top position: sum of buttons and gaps before, plus half current gap, minus half flat button
          let top = 0;
          for (let i = 0; i < gapIndex; i++) {
            top += buttonHeight + (i === 3 ? narrowGap : wideGap);
          }
          top += buttonHeight + (wideGap / 2) - (flatButtonHeight / 2);
          
          const isLastPressed = overlayNote === pitch;
          
          return (
            <div key={pitch} className="absolute w-full" style={{ top: `${top}rem` }}>
              <Button
                onClick={() => onNotePress(pitch)}
                className={`h-12 w-full text-lg font-bold text-white relative ${getNoteButtonColor("semitone")}`}
                disabled={disabled}
                title={semitonesToSolfege(pitch, true)}
              >
                # / b
                {isLastPressed && overlayNoteTick !== null && (
                  <div className={`absolute inset-0 flex items-center justify-center animate-scale-in`}>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                      {overlayNoteTick ? (
                        <Check className="w-7 h-7 text-green-500" strokeWidth={3} />
                      ) : (
                        <X className="w-7 h-7 text-red-500" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SolfegeKeyboard;
