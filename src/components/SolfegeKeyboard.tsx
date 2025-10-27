import React, { useEffect, useRef } from "react";
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
  /** Range of semitones to display [min, max]. Default [0, 12] for one octave. */
  range?: [SemitoneOffset, SemitoneOffset];
}

const SolfegeKeyboard: React.FC<SolfegeKeyboardProps> = ({
  rootMidi,
  onNotePress,
  overlayNote = null,
  overlayNoteTick = null,
  disabled = false,
  range = [0, 11],
}) => {
  // Shared spacing constants used by both the solfege column and the chromatic column.
  // Units: rem for the layout math, and Tailwind margin classes for the button stack.
  const WIDE_GAP_REM = 1.0; // rem - used for both solfege stack spacing and chromatic math
  const NARROW_GAP_REM = 0.2; // rem - used for smaller spacing

  // Generate all major scale notes within the range
  const generateMajorScaleNotes = () => {
    const notes: SemitoneOffset[] = [];
    const [minSemitone, maxSemitone] = range;
    
    // Generate notes for each octave in range
    const minOctave = Math.floor(minSemitone / 12);
    const maxOctave = Math.ceil(maxSemitone / 12);
    
    for (let octave = minOctave; octave <= maxOctave; octave++) {
      for (const pitch of MAJOR_SCALE_PITCH_CLASSES) {
        const semitone = octave * 12 + pitch;
        if (semitone >= minSemitone && semitone <= maxSemitone) {
          notes.push(semitone as SemitoneOffset);
        }
      }
    }
    
    return notes.sort((a, b) => b - a); // Reverse for high-to-low display
  };

  // Generate all chromatic notes within the range
  const generateChromaticNotes = () => {
    const notes: SemitoneOffset[] = [];
    const [minSemitone, maxSemitone] = range;
    const chromaticPitches = [1, 3, 6, 8, 10];
    
    const minOctave = Math.floor(minSemitone / 12);
    const maxOctave = Math.ceil(maxSemitone / 12);
    
    for (let octave = minOctave; octave <= maxOctave; octave++) {
      for (const pitch of chromaticPitches) {
        const semitone = octave * 12 + pitch;
        if (semitone >= minSemitone && semitone <= maxSemitone) {
          notes.push(semitone as SemitoneOffset);
        }
      }
    }
    
    return notes.sort((a, b) => b - a); // Reverse for high-to-low display
  };

  // Heights (rem)
  const buttonHeightREM = 4; // matches h-16
  const flatButtonHeightREM = 3; // matches h-12

  const majorScaleNotes = generateMajorScaleNotes();
  const chromaticNotes = generateChromaticNotes();
  
  // Ref for scrolling to the main octave center
  const mainOctaveCenterRef = useRef<HTMLDivElement>(null);
  
  // Scroll to center the main octave on mount
  useEffect(() => {
    if (mainOctaveCenterRef.current) {
      mainOctaveCenterRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  // Build a map from diatonic note -> top offset (rem), and compute total column height
  const diatonicTopMap = new Map<SemitoneOffset, number>();
  let accTop = 0;
  for (let i = 0; i < majorScaleNotes.length; i++) {
    const note = majorScaleNotes[i];
    diatonicTopMap.set(note, accTop);
    const next = majorScaleNotes[i + 1];
    if (next !== undefined) {
      const isWide = Math.abs(note - next) === 2;
      accTop += buttonHeightREM + (isWide ? WIDE_GAP_REM : NARROW_GAP_REM);
    }
  }
  const totalHeightRem = accTop + buttonHeightREM;

  // Check if a note is in the main octave (0-11)
  const isInMainOctave = (semitone: SemitoneOffset) => semitone >= 0 && semitone <= 11;

  return (
    <div className="flex gap-2">
      {/* Main (major scale / solfege) notes column */}
      <div className="flex-1 flex flex-col">
        {majorScaleNotes.map((pitch, index) => {
          let solfege = semitonesToSolfege(pitch, true);
          
          // Calculate gap - wider except between Mi-Fa (natural semitone)
          const nextPitch = majorScaleNotes[index + 1];
          const hasChromatic = nextPitch !== undefined && Math.abs(pitch - nextPitch) === 2;
          // use rem-based inline margin so units match the chromatic column math
          const gapStyle = { marginBottom: `${hasChromatic ? WIDE_GAP_REM : NARROW_GAP_REM}rem` } as React.CSSProperties;
          
          const isLastPressed = overlayNote === pitch;
          const inMainOctave = isInMainOctave(pitch);
          const isCenterOfMainOctave = pitch === 5; // Fa is roughly in the center of main octave
          
          return (
            <div 
              key={pitch} 
              ref={isCenterOfMainOctave ? mainOctaveCenterRef : null}
              className={`relative ${!inMainOctave ? 'flex justify-end' : ''}`} 
              style={index < majorScaleNotes.length - 1 ? gapStyle : undefined}
            >
              <Button
                onClick={() => onNotePress(pitch)}
                className={`h-16 text-xl font-bold text-white relative ${getNoteButtonColor(semitonesToSolfege(pitch))} ${!inMainOctave ? 'opacity-70 w-2/3' : 'w-full'}`}
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
      <div className="w-24 relative" style={{ height: `${totalHeightRem}rem` }}>
        {/* Chromatic notes positioned in gaps */}
        {chromaticNotes.map((pitch) => {
          // Determine the diatonic note just above this chromatic note within the stack
          const indexAbove = majorScaleNotes.findIndex((n, i) => n > pitch && (i === majorScaleNotes.length - 1 || majorScaleNotes[i + 1] <= pitch));
          if (indexAbove === -1 || indexAbove >= majorScaleNotes.length - 1) return null;

          const noteAbove = majorScaleNotes[indexAbove];
          const noteBelow = majorScaleNotes[indexAbove + 1];

          const gapWidth = Math.abs(noteAbove - noteBelow) === 2 ? WIDE_GAP_REM : NARROW_GAP_REM;

          // Top position is centered in the gap between the two diatonic notes
          const topOfAbove = diatonicTopMap.get(noteAbove) ?? 0;
          const top = topOfAbove + buttonHeightREM + (gapWidth / 2) - (flatButtonHeightREM / 2);

          const isLastPressed = overlayNote === pitch;
          const inMainOctave = isInMainOctave(pitch);

          return (
            <div key={pitch} className="absolute w-full" style={{ top: `${top}rem` }}>
              <div className={''}>
                <Button
                  onClick={() => onNotePress(pitch)}
                  className={`h-12 text-lg font-bold text-white relative ${getNoteButtonColor("semitone")} ${!inMainOctave ? 'opacity-70 w-full' : 'w-full'}`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SolfegeKeyboard;
