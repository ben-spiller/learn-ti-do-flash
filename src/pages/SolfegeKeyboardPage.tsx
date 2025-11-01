import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  setMasterVolume,
  keypressToSemitones,
  midiToNoteName,
  isAudioInitialized,
  NOTE_NAMES
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
  const [activeTab, setActiveTab] = useState<"notes" | "chords">("notes");
  
  const currentInstrument = activeTab === "notes" ? settings.notesInstrument : settings.chordsInstrument;
  const currentVolume = activeTab === "notes" ? settings.notesVolume : settings.chordsVolume;
  
  // Persist settings whenever they change
  useEffect(() => {
    saveKeyboardSettings(settings);
  }, [settings]);
  
  // Reload instrument when switching tabs if needed
  useEffect(() => {
    if (hasPreloaded) {
      const needsReload = activeTab === "notes" 
        ? settings.notesInstrument 
        : settings.chordsInstrument;
      
      preloadInstrumentWithGesture(needsReload).then(() => {
        setMasterVolume(currentVolume);
      });
    }
  }, [activeTab]);
  
  // Auto-start if audio is already initialized for this instrument
  useEffect(() => {
    if (!hasPreloaded && isAudioInitialized(currentInstrument)) {
      setHasPreloaded(true);
      
      // Set master volume
      setMasterVolume(currentVolume);
      
      // Start drone if enabled
      if (settings.droneEnabled) {
        startDrone(rootMidi, settings.droneVolume);
      }
    }
  }, []);
  
  // Try to auto-preload on mount (navigation from another page is a gesture)
  useEffect(() => {
    if (!hasPreloaded && !isPreloading) {
      // Add a timeout to prevent hanging forever
      const timeoutId = setTimeout(() => {
        if (isPreloading) {
          setIsPreloading(false);
        }
      }, 2000); // Give it 2 seconds max
      
      handleStart(true).finally(() => {
        clearTimeout(timeoutId);
      });
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
  
  const handleStart = async (silent = false) => {
    if (hasPreloaded) return;
    
    setIsPreloading(true);
    
    try {
      // Try to start audio context - this will fail silently if no gesture
      const Tone = (window as any).Tone;
      if (Tone && typeof Tone.start === 'function') {
        await Tone.start();
      }
      
      const ok = await preloadInstrumentWithGesture(currentInstrument);
      setIsPreloading(false);
      
      if (ok) {
        setHasPreloaded(true);
        
        // Set master volume
        setMasterVolume(currentVolume);
        
        // Start drone if enabled
        if (settings.droneEnabled) {
          startDrone(rootMidi, settings.droneVolume);
        }
      } else if (!silent) {
        // Only show alert if this was an explicit user action
        window.alert('Unable to initialize audio. Please try again.');
      }
    } catch (err) {
      setIsPreloading(false);
      // Silent auto-start: don't show alert, just leave start button visible
      if (!silent) {
        console.error('Failed to start audio:', err);
        window.alert('Unable to initialize audio. Audio will not be available.');
      }
    }
  };
  
  const handleNotePress = (note: SemitoneOffset) => {
    if (isSelectingRoot) {
      // Set the root note based on the selected semitone
      const newRootNote = midiToNoteName(rootMidi + note);
      handleRootNoteChange(parseNoteName(newRootNote).noteName+parseNoteName(settings.rootNote).octave);
      setIsSelectingRoot(false);
    } else {
      stopSounds();
      
      if (activeTab === "chords") {
        // Determine chord quality based on scale degree
        const scaleDegree = note % 12;
        let third: number;
        let fifth: number;
        
        // Major scale chord qualities:
        // I (0), IV (5), V (7) = Major (major 3rd, perfect 5th)
        // ii (2), iii (4), vi (9) = minor (minor 3rd, perfect 5th)
        // vii° (11) = diminished (minor 3rd, diminished 5th)
        if (scaleDegree === 0 || scaleDegree === 5 || scaleDegree === 7) {
          // Major chord
          third = 4;
          fifth = 7;
        } else if (scaleDegree === 11) {
          // Diminished chord
          third = 3;
          fifth = 6;
        } else {
          // minor chord (2, 4, 9)
          third = 3;
          fifth = 7;
        }
        
        const rootNote3 = noteNameToMidi("C3") + note;
        const rootNote4 = noteNameToMidi("C4") + note;
        
        // Octave 3: root, 5th, octave
        playNote(rootNote3, 2);
        playNote(rootNote3 + fifth, 2);
        playNote(rootNote3 + 12, 2);
        
        // Octave 4: root, 3rd, 5th
        playNote(rootNote4, 2);
        playNote(rootNote4 + third, 2);
        playNote(rootNote4 + fifth, 2);
      } else {
        // Normal single note playing
        playNote(note + rootMidi);
      }
      
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
    if (activeTab === "notes") {
      setSettings({ ...settings, notesInstrument: instrument });
    } else {
      setSettings({ ...settings, chordsInstrument: instrument });
    }
    
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
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    if (activeTab === "notes") {
      setSettings({ ...settings, notesVolume: newVolume });
    } else {
      setSettings({ ...settings, chordsVolume: newVolume });
    }
    if (hasPreloaded) {
      setMasterVolume(newVolume);
    }
  };
  
  // Generate note options from C2 to C6
  const noteOptions = [];
  for (let octave = 2; octave <= 6; octave++) {
    for (const note of NOTE_NAMES) {
      noteOptions.push(`${note}${octave}`);
    }
  }
  
  
  // Parse note name properly to handle sharps and any octave number
  const parseNoteName = (fullNote: string) => {
    const match = fullNote.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!match) return { noteName: 'C', octave: 4 }; // Fallback
    return { noteName: match[1], octave: parseInt(match[2]) };
  };
  
  const { noteName: currentNoteName, octave: currentOctave } = parseNoteName(settings.rootNote);

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
                onClick={() => handleStart(false)} 
                disabled={isPreloading}
                className="w-full"
                size="lg"
              >
                {isPreloading ? "Loading..." : "Start Playing"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "notes" | "chords")}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="chords">Chords</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notes">
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
                      : "Click notes to play, or use keyboard shortcuts d/r/m/... or 1/2/3/..."}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="chords">
              <Card>
                <CardContent className="pt-6">
                  <SolfegeKeyboard
                    rootMidi={rootMidi}
                    onNotePress={handleNotePress}
                    overlayNote={lastPressedNote}
                    overlayNoteTick={null}
                    disabled={false}
                    range={[0, 12]}
                    showChordLabels={true}
                  />
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    {isSelectingRoot 
                      ? "Click a note to set as root note" 
                      : "Click to play chords built on each scale degree"}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        {/* Settings Card - Below Keyboard */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Root Note and Octave */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Root/Do Note</label>
              <div className="grid grid-cols-3 gap-2">
                <Select 
                  value={currentNoteName} 
                  onValueChange={(note) => handleRootNoteChange(`${note}${currentOctave}`)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_NAMES.map(note => (
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
                  From Keyboard
                </Button>
              </div>
            </div>
            
            {/* Instrument Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {activeTab === "notes" ? "Notes" : "Chords"} Instrument
              </label>
              <Select value={currentInstrument} onValueChange={handleInstrumentChange}>
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
            
            {/* Volume Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {activeTab === "notes" ? "Notes" : "Chords"} Volume
              </label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!hasPreloaded} className="w-full">
                      <Volume2 className="h-4 w-4 mr-2" />
                      {currentVolume} dB
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {activeTab === "notes" ? "Note" : "Chord"} Volume
                      </label>
                      <Slider
                        value={[currentVolume]}
                        onValueChange={handleVolumeChange}
                        min={-20}
                        max={30}
                        step={2}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        {currentVolume} dB
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Drone Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Background root drone</label>
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
