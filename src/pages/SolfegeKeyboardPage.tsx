import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { 
  stopSounds, 
  MidiNoteNumber, 
  SemitoneOffset, 
  playNote, 
  noteNameToMidi, 
  preloadInstrumentWithGesture, 
  startDrone, 
  stopDrone, 
  setDroneVolume as setAudioDroneVolume,
  keypressToSemitones,
  midiToNoteName,
  isAudioInitialized
} from "@/utils/audio";
import { formatInstrumentName, INSTRUMENT_SLUGS } from "@/config/ConfigData";
import { getKeyboardSettings, saveKeyboardSettings, KeyboardSettings } from "@/utils/keyboardStorage";
import SolfegeKeyboard from "@/components/SolfegeKeyboard";

const SolfegeKeyboardPage = () => {
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState<KeyboardSettings>(getKeyboardSettings());
  const [rootMidi, setRootMidi] = useState<MidiNoteNumber>(noteNameToMidi(settings.rootNote));
  const [lastPressedNote, setLastPressedNote] = useState<SemitoneOffset | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);
  const [isSelectingRoot, setIsSelectingRoot] = useState(false);
  
  // Persist settings whenever they change
  useEffect(() => {
    saveKeyboardSettings(settings);
  }, [settings]);
  
  // Auto-start if audio is already initialized for this instrument
  useEffect(() => {
    if (!hasPreloaded && isAudioInitialized(settings.instrument)) {
      setHasPreloaded(true);
      
      // Start drone if enabled
      if (settings.droneEnabled) {
        startDrone(rootMidi, settings.droneVolume);
      }
    }
  }, []);
  
  // Cleanup drone on unmount
  useEffect(() => {
    return () => {
      stopDrone();
      stopSounds();
    };
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!hasPreloaded) return;
      
      const note = keypressToSemitones(e);
      if (note !== null) {
        e.preventDefault();
        handleNotePress(note);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasPreloaded, rootMidi]);
  
  const handleStart = async () => {
    if (hasPreloaded) return;
    
    setIsPreloading(true);
    const ok = await preloadInstrumentWithGesture(settings.instrument);
    setIsPreloading(false);
    
    if (ok) {
      setHasPreloaded(true);
      
      // Start drone if enabled
      if (settings.droneEnabled) {
        startDrone(rootMidi, settings.droneVolume);
      }
    }
  };
  
  const handleNotePress = (note: SemitoneOffset) => {
    if (isSelectingRoot) {
      // Set the root note based on the selected semitone
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteName = noteNames[note % 12];
      const currentOctave = parseInt(settings.rootNote.slice(-1));
      const newRootNote = `${noteName}${currentOctave}`;
      handleRootNoteChange(newRootNote);
      setIsSelectingRoot(false);
    } else {
      // Normal note playing
      stopSounds();
      playNote(note + rootMidi);
      setLastPressedNote(note);
      
      // Clear visual feedback after animation
      setTimeout(() => {
        setLastPressedNote(null);
      }, 300);
    }
  };
  
  const handleRootNoteChange = (noteName: string) => {
    const newRootMidi = noteNameToMidi(noteName);
    setRootMidi(newRootMidi);
    setSettings({ ...settings, rootNote: noteName });
    
    // Restart drone if it's playing
    if (settings.droneEnabled && hasPreloaded) {
      stopDrone();
      startDrone(newRootMidi, settings.droneVolume);
    }
  };
  
  const handleInstrumentChange = async (instrument: string) => {
    setSettings({ ...settings, instrument });
    
    // Reload instrument if already preloaded
    if (hasPreloaded) {
      setIsPreloading(true);
      await preloadInstrumentWithGesture(instrument);
      setIsPreloading(false);
    }
  };
  
  const handleDroneToggle = () => {
    const newEnabled = !settings.droneEnabled;
    setSettings({ ...settings, droneEnabled: newEnabled });
    
    if (hasPreloaded) {
      if (newEnabled) {
        startDrone(rootMidi, settings.droneVolume);
      } else {
        stopDrone();
      }
    }
  };
  
  const handleDroneVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setSettings({ ...settings, droneVolume: newVolume });
    if (settings.droneEnabled && hasPreloaded) {
      setAudioDroneVolume(newVolume);
    }
  };
  
  // Generate note options from C2 to C6
  const noteOptions = [];
  for (let octave = 2; octave <= 6; octave++) {
    for (const note of ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']) {
      noteOptions.push(`${note}${octave}`);
    }
  }
  
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const currentNoteName = settings.rootNote.slice(0, -1);
  const currentOctave = parseInt(settings.rootNote.slice(-1));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Compact Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Solfege Keyboard</h1>
        </div>
        
        {/* Start Button or Keyboard */}
        {!hasPreloaded ? (
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleStart} 
                disabled={isPreloading}
                className="w-full"
                size="lg"
              >
                {isPreloading ? "Loading..." : "Start Playing"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <SolfegeKeyboard
                rootMidi={rootMidi}
                onNotePress={handleNotePress}
                overlayNote={lastPressedNote}
                overlayNoteTick={null}
                disabled={false}
                range={[-12, 24]}
              />
              <div className="mt-4 text-sm text-muted-foreground text-center">
                {isSelectingRoot 
                  ? "Click a note to set as root note" 
                  : "Click notes to play, or use keyboard shortcuts"}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Settings Card - Below Keyboard */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Root Note and Octave */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Root Note</label>
              <div className="grid grid-cols-3 gap-2">
                <Select 
                  value={currentNoteName} 
                  onValueChange={(note) => handleRootNoteChange(`${note}${currentOctave}`)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {noteNames.map(note => (
                      <SelectItem key={note} value={note}>{note}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={currentOctave.toString()} 
                  onValueChange={(octave) => handleRootNoteChange(`${currentNoteName}${octave}`)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map(octave => (
                      <SelectItem key={octave} value={octave.toString()}>{octave}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant={isSelectingRoot ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSelectingRoot(!isSelectingRoot)}
                  disabled={!hasPreloaded}
                  className="h-10"
                >
                  Select
                </Button>
              </div>
            </div>
            
            {/* Instrument Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Instrument</label>
              <Select value={settings.instrument} onValueChange={handleInstrumentChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {INSTRUMENT_SLUGS.map(slug => (
                    <SelectItem key={slug} value={slug}>
                      {formatInstrumentName(slug)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Drone Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Drone</label>
              <div className="flex items-center gap-2">
                <Button
                  variant={settings.droneEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleDroneToggle}
                  disabled={!hasPreloaded}
                  className="w-24"
                >
                  {settings.droneEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                  {settings.droneEnabled ? "On" : "Off"}
                </Button>
                
                {settings.droneEnabled && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" disabled={!hasPreloaded}>
                        Volume
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Drone Volume</label>
                        <Slider
                          value={[settings.droneVolume]}
                          onValueChange={handleDroneVolumeChange}
                          min={-20}
                          max={0}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-center">
                          {settings.droneVolume} dB
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SolfegeKeyboardPage;
