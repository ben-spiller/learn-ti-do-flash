import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, History, MoreVertical, HelpCircle, Music, Shuffle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import appIcon from "@/assets/app-icon.png";
import { toast } from "@/hooks/use-toast";
import {
  preloadInstrumentWithGesture,
  SemitoneOffset,
  semitonesToInterval,
  playSequence,
  noteNameToMidi,
  stopSounds,
  MAJOR_SCALE_PITCH_CLASSES,
} from "@/utils/audio";
import {
  ConfigData,
  INSTRUMENT_OPTIONS,
  CONSTRAINTS,
  formatInstrumentName,
} from "@/config/ConfigData";
import {
  getSavedConfigurations,
  saveConfiguration,
  deleteConfiguration,
  loadConfiguration,
  getCurrentConfiguration,
  saveCurrentConfiguration,
  SavedConfiguration,
} from "@/utils/settingsStorage";
import { InstrumentSelector } from "@/components/InstrumentSelector";

const SettingsView = () => {
  const navigate = useNavigate();
  
  // Load current configuration or use defaults
  const currentConfig = getCurrentConfiguration();
  const defaults = currentConfig || new ConfigData();
  
  const [selectedNotes, setSelectedNotes] = useState<number[]>(defaults.selectedNotes);
  const [numberOfNotes, setNumberOfNotes] = useState(defaults.numberOfNotes);
  const [playExtraNotes, setPlayExtraNotes] = useState(defaults.playExtraNotes);
  const [intervalRange, setIntervalRange] = useState([defaults.minInterval, defaults.maxInterval]);
  const [questionNoteRange, setQuestionNoteRange] = useState<[SemitoneOffset, SemitoneOffset]>(defaults.questionNoteRange);
  const [tempo, setTempo] = useState(defaults.tempo);
  const [rhythm, setRhythm] = useState(defaults.rhythm);
  const [droneType, setDroneType] = useState(defaults.droneType);
  const [referenceType, setReferenceType] = useState(defaults.referenceType);
  const [rootNotePitch, setRootNotePitch] = useState(defaults.rootNotePitch);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(defaults.instrument);
  const [instrumentMode, setInstrumentMode] = useState<"single" | "random">(defaults.instrumentMode);
  const [favouriteInstruments, setFavouriteInstruments] = useState<string[]>(defaults.favouriteInstruments);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [instrumentDialogOpen, setInstrumentDialogOpen] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  
  // Saved configurations state
  const [savedConfigs, setSavedConfigs] = useState<SavedConfiguration[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [configName, setConfigName] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");

  // Load saved configurations on mount
  useEffect(() => {
    setSavedConfigs(getSavedConfigurations());
  }, []);

  // TODO: instead of this, store the entire ConfigData object as a state
  const getCurrentSettings = (): ConfigData => {
    return new ConfigData({
      selectedNotes,
      numberOfNotes,
      playExtraNotes,
      minInterval: intervalRange[0],
      maxInterval: intervalRange[1],
      questionNoteRange,
      tempo,
      rhythm,
      droneType,
      referenceType,
      rootNotePitch,
      instrument: selectedInstrument,
      instrumentMode,
      favouriteInstruments,
    });
  };

  const configMatches = (config: SavedConfiguration): boolean => {
    const current = getCurrentSettings();
    // TODO: move this to the ConfigData class
    return (
      JSON.stringify(config.settings.selectedNotes.sort()) === JSON.stringify(current.selectedNotes.sort()) &&
      config.settings.numberOfNotes === current.numberOfNotes &&
      config.settings.playExtraNotes === current.playExtraNotes &&
      config.settings.minInterval === current.minInterval &&
      config.settings.maxInterval === current.maxInterval &&
      JSON.stringify(config.settings.questionNoteRange) === JSON.stringify(current.questionNoteRange) &&
      config.settings.tempo === current.tempo &&
      config.settings.rhythm === current.rhythm &&
      config.settings.droneType === current.droneType &&
      config.settings.referenceType === current.referenceType &&
      config.settings.rootNotePitch === current.rootNotePitch &&
      config.settings.instrument === current.instrument &&
      config.settings.instrumentMode === current.instrumentMode &&
      JSON.stringify(config.settings.favouriteInstruments.sort()) === JSON.stringify(current.favouriteInstruments.sort())
    );
  };

  const loadConfig = (id: string) => {
    const settings = loadConfiguration(id);
    if (!settings) return;
    
    setSelectedNotes(settings.selectedNotes);
    setNumberOfNotes(settings.numberOfNotes);
    setPlayExtraNotes(settings.playExtraNotes);
    setIntervalRange([settings.minInterval, settings.maxInterval]);
    setQuestionNoteRange(settings.questionNoteRange);
    setTempo(settings.tempo);
    setRhythm(settings.rhythm);
    setDroneType(settings.droneType);
    setReferenceType(settings.referenceType);
    setRootNotePitch(settings.rootNotePitch);
    setSelectedInstrument(settings.instrument);
    setInstrumentMode(settings.instrumentMode);
    setFavouriteInstruments(settings.favouriteInstruments);
  };

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this configuration.",
        variant: "destructive",
      });
      return;
    }
    
    const currentSettings = getCurrentSettings();
    const existingConfig = savedConfigs.find(c => c.name === configName.trim());
    
    saveConfiguration(configName.trim(), currentSettings);
    setSavedConfigs(getSavedConfigurations());
    setConfigName("");
    setSaveDialogOpen(false);
    
    toast({
      title: existingConfig ? "Configuration Updated" : "Configuration Saved",
      description: existingConfig 
        ? `"${configName.trim()}" has been updated.`
        : `"${configName.trim()}" has been saved.`,
    });
  };

  const handleDeleteConfig = (id: string, name: string) => {
    deleteConfiguration(id);
    setSavedConfigs(getSavedConfigurations());
    if (selectedConfigId === id) {
      setSelectedConfigId("");
    }
    
    toast({
      title: "Configuration Deleted",
      description: `"${name}" has been removed.`,
    });
  };


  const handleNoteToggle = (interval: number) => {
    setSelectedNotes((prev) =>
      prev.includes(interval) ? prev.filter((n) => n !== interval) : [...prev, interval]
    );
  };

  const handleStart = async () => {
    if (selectedNotes.length < 2) {
      alert("Please select at least 2 notes to practice");
      return;
    }
    
    setIsPreloading(true);
    
    // Show loading indicator only if preload takes more than 400ms
    const loadingTimer = setTimeout(() => {
      setShowLoadingIndicator(true);
    }, 400);
    
    try {
      // Determine which instrument to preload based on mode
      const currentSettings = getCurrentSettings();
      const instrumentToPreload = currentSettings.pickInstrument();
      
      await preloadInstrumentWithGesture(instrumentToPreload);
      clearTimeout(loadingTimer);
      setShowLoadingIndicator(false);
      setIsPreloading(false);
      
      // Save current configuration so practice can restore later
      saveCurrentConfiguration(getCurrentSettings());
      
      navigate("/practice", {
        state: { 
          selectedNotes, 
          numberOfNotes,
          playExtraNotes,
          minInterval: intervalRange[0],
          maxInterval: intervalRange[1],
          questionNoteRange,
          tempo,
          rhythm,
          droneType,
          referenceType,
          rootNotePitch,
          instrument: selectedInstrument,
          instrumentMode,
          favouriteInstruments,
          sessionInstrument: instrumentToPreload, // Pass the picked instrument for this session
          preloaded: true
        },
      });
    } catch (e) {
      clearTimeout(loadingTimer);
      setShowLoadingIndicator(false);
      setIsPreloading(false);
    }
  };


  // TODO: this is a crazy way to do it - refactor this to something more compact
  const SOLFEGE_TO_INTERVAL: Record<string, SemitoneOffset> = {
    "Do": 0,
    "Re": 2,
    "Mi": 4,
    "Fa": 5,
    "Sol": 7,
    "La": 9,
    "Ti": 11,
  };

  const INTERVAL_TO_SOLFEGE: Record<SemitoneOffset, string> = {
    0: "Do",
    2: "Re",
    4: "Mi",
    5: "Fa",
    7: "Sol",
    9: "La",
    11: "Ti",
  };

  // Generate question note range options from major scale notes spanning -12 to +24
  const generateMajorScaleRangeOptions = () => {
    const options: number[] = [];
    for (let octave = -1; octave <= 2; octave++) {
      for (const pitchClass of MAJOR_SCALE_PITCH_CLASSES) {
        const semitones = octave * 12 + pitchClass;
        if (semitones >= -12 && semitones <= 24) {
          options.push(semitones);
        }
      }
    }
    return options.sort((a, b) => a - b);
  };

  const majorScaleRangeValues = generateMajorScaleRangeOptions();

  // Format a semitone offset as a solfege label with octave
  const formatQuestionRangeLabel = (semitones: number): string => {
    const octaveOffset = Math.floor(semitones / 12);
    const noteInOctave = ((semitones % 12) + 12) % 12;
    const noteName = INTERVAL_TO_SOLFEGE[noteInOctave as SemitoneOffset] || "";
    
    if (octaveOffset === -1) return `${noteName} (-1 oct)`;
    if (octaveOffset === 1) return `${noteName} (+1 oct)`;
    if (octaveOffset === 2) return `${noteName} (+2 oct)`;
    return noteName;
  };

  // Root note pitch options
  const ROOT_NOTE_OPTIONS = [
    "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
    "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
    "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
  ];

  const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
      <Card className="w-full">
        <CardHeader className="text-center relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/history")}>
                <History className="h-4 w-4 mr-2" />
                Practice History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {location.href='https://github.com/ben-spiller/learn-ti-do-flash/blob/main/README.md';}}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Help / GitHub
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex justify-center mb-4">
            <img src={appIcon} alt="LearnTiDo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-3xl font-bold">LearnTiDo</CardTitle>
          <CardDescription>Configure your practice settings</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Saved Configurations - Card Grid */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">My Configurations</Label>
              <Dialog open={saveDialogOpen} onOpenChange={(open) => {
                setSaveDialogOpen(open);
                if (!open) setConfigName("");
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Configuration</DialogTitle>
                    <DialogDescription>
                      Type a new name or select an existing one to update.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="config-name">Configuration Name</Label>
                      <div className="relative">
                        <Input
                          id="config-name"
                          list="config-suggestions"
                          placeholder="Type new or select existing..."
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveConfig();
                            }
                          }}
                          maxLength={50}
                          className="pr-10"
                        />
                        <datalist id="config-suggestions">
                          {savedConfigs.map((config) => (
                            <option key={config.id} value={config.name} />
                          ))}
                        </datalist>
                      </div>
                      {savedConfigs.some(c => c.name === configName.trim()) && configName.trim() && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Will update existing "{configName.trim()}"
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setSaveDialogOpen(false);
                      setConfigName("");
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveConfig}>
                      {savedConfigs.some(c => c.name === configName.trim()) && configName.trim() ? "Update" : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {savedConfigs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {savedConfigs.map((config) => {
                  const isMatching = configMatches(config);
                  return (
                  <Card 
                    key={config.id} 
                    className={`relative cursor-pointer hover:border-primary transition-colors group ${
                      isMatching ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedConfigId(config.id);
                      loadConfig(config.id);
                    }}
                  >
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm truncate pr-6">{config.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>{config.settings.numberOfNotes} notes • {config.settings.tempo} BPM</div>
                        <div className="truncate">
                          {config.settings.selectedNotes.length} scale notes
                        </div>
                      </div>
                    </CardContent>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConfig(config.id, config.name);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved configurations yet. Click "Save" to create your first one.
              </p>
            )}
          </div>
          <Tabs defaultValue="practice" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="reference">Reference</TabsTrigger>
            </TabsList>

            <TabsContent value="practice" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Notes per Question</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNumberOfNotes(Math.max(CONSTRAINTS.numberOfNotes.min, numberOfNotes - 1))}
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold">{numberOfNotes}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNumberOfNotes(Math.min(CONSTRAINTS.numberOfNotes.max, numberOfNotes + 1))}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Play Extra Notes</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPlayExtraNotes(Math.max(CONSTRAINTS.playExtraNotes.min, playExtraNotes - 1))}
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold">{playExtraNotes}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPlayExtraNotes(Math.min(CONSTRAINTS.playExtraNotes.max, playExtraNotes + 1))}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Random notes played after the sequence (don't need to guess)
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Tempo: {tempo} BPM</Label>
                <Slider
                  value={[tempo]}
                  onValueChange={(v) => setTempo(v[0])}
                  min={CONSTRAINTS.tempo.min}
                  max={CONSTRAINTS.tempo.max}
                  step={CONSTRAINTS.tempo.step}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Notes to Practice</Label>
                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedNotes.length} notes selected: {selectedNotes.map(i => INTERVAL_TO_SOLFEGE[i]).join(", ")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Notes to Practice</DialogTitle>
                      <DialogDescription>Choose which solfege notes you want to practice</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                      {SOLFEGE_NOTES.map((note) => {
                        const interval = SOLFEGE_TO_INTERVAL[note];
                        return (
                          <div key={note} className="flex items-center space-x-3">
                            <Checkbox
                              id={note}
                              checked={selectedNotes.includes(interval)}
                              onCheckedChange={() => handleNoteToggle(interval)}
                            />
                            <Label
                              htmlFor={note}
                              className="text-base cursor-pointer flex-1 py-2"
                            >
                              {note}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    <Button onClick={() => setNotesDialogOpen(false)}>Done</Button>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  Question Note Range: {formatQuestionRangeLabel(questionNoteRange[0])} - {formatQuestionRangeLabel(questionNoteRange[1])}
                </Label>
                <Slider
                  value={[
                    majorScaleRangeValues.indexOf(questionNoteRange[0]),
                    majorScaleRangeValues.indexOf(questionNoteRange[1])
                  ]}
                  onValueChange={(values) => {
                    const newRange: [SemitoneOffset, SemitoneOffset] = [
                      majorScaleRangeValues[values[0]],
                      majorScaleRangeValues[values[1]]
                    ];
                    setQuestionNoteRange(newRange);
                  }}
                  min={0}
                  max={majorScaleRangeValues.length - 1}
                  step={1}
                  minStepsBetweenThumbs={1}
                />
                <p className="text-xs text-muted-foreground">
                  Questions can span multiple octaves, but answers remain in the same octave
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold" title="Use this to focus on the common small intervals (e.g. 2 <= 4 semitones) until you've mastered the differences. Later you could use it to do focused practice on large intervals.">
                  Consecutive Notes Range: {semitonesToInterval(intervalRange[0])} - {semitonesToInterval(intervalRange[1])}</Label>
                <Slider
                  value={intervalRange}
                  onValueChange={(values) => {
                    // Ensure min and max are always different
                    if (values[0] === values[1]) {
                      return;
                    }
                    setIntervalRange(values);
                  }}
                  min={CONSTRAINTS.interval.min}
                  max={CONSTRAINTS.interval.max}
                  step={1}
                  minStepsBetweenThumbs={1}
                />
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Instrument</Label>
                <Button
                  variant="outline"
                  onClick={() => setInstrumentDialogOpen(true)}
                  className="w-full justify-start h-auto py-3 px-4"
                >
                  <div className="flex items-start gap-3 w-full">
                    {instrumentMode === "single" ? (
                      <Music className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Shuffle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex flex-col items-start text-left">
                      <span className="font-semibold">
                        {instrumentMode === "single" ? "Single Instrument" : "Random from Favourites"}
                      </span>
                      <span className="text-sm text-muted-foreground font-normal">
                        {instrumentMode === "single" 
                          ? formatInstrumentName(selectedInstrument)
                          : `${favouriteInstruments.length} favourite${favouriteInstruments.length !== 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>
                </Button>

                <InstrumentSelector
                  open={instrumentDialogOpen}
                  onOpenChange={setInstrumentDialogOpen}
                  selectedInstrument={selectedInstrument}
                  onInstrumentChange={async (instrument) => {
                    setSelectedInstrument(instrument);
                    if (instrumentMode === "single") {
                      setIsPreloading(true);
                      try {
                        stopSounds();
                        await preloadInstrumentWithGesture(instrument);
                        const rootMidi = noteNameToMidi(rootNotePitch);
                        await playSequence([
                          { note: rootMidi, duration: 0.3, gapAfter: 0.1 },
                          { note: rootMidi + 4, duration: 0.3, gapAfter: 0.1 },
                          { note: rootMidi + 7, duration: 0.3, gapAfter: 0.1 },
                          { note: rootMidi + 12, duration: 0.5, gapAfter: 0 },
                        ]);
                      } catch (_) {}
                      setIsPreloading(false);
                    }
                  }}
                  instrumentMode={instrumentMode}
                  onInstrumentModeChange={setInstrumentMode}
                  favouriteInstruments={favouriteInstruments}
                  onFavouriteInstrumentsChange={setFavouriteInstruments}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Rhythm</Label>
                <div className="flex gap-2">
                  <Button
                    variant={rhythm === "fixed" ? "default" : "outline"}
                    onClick={() => setRhythm("fixed")}
                    className="flex-1"
                  >
                    Fixed
                  </Button>
                  <Button
                    variant={rhythm === "random" ? "default" : "outline"}
                    onClick={() => setRhythm("random")}
                    className="flex-1"
                  >
                    Random
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Root Note Pitch</Label>
                <select
                  value={rootNotePitch}
                  onChange={(e) => setRootNotePitch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {ROOT_NOTE_OPTIONS.map(pitch => (
                    <option key={pitch} value={pitch}>{pitch}</option>
                  ))}
                </select>
              </div>
            </TabsContent>

            <TabsContent value="reference" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Reference Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={referenceType === "root" ? "default" : "outline"}
                    onClick={() => setReferenceType("root")}
                    className="flex-1"
                  >
                    Root Note
                  </Button>
                  <Button
                    variant={referenceType === "arpeggio" ? "default" : "outline"}
                    onClick={() => setReferenceType("arpeggio")}
                    className="flex-1"
                  >
                    Arpeggio
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Background Drone</Label>
                <div className="flex gap-2">
                  <Button
                    variant={droneType === "none" ? "default" : "outline"}
                    onClick={() => setDroneType("none")}
                    className="flex-1"
                  >
                    None
                  </Button>
                  <Button
                    variant={droneType === "root" ? "default" : "outline"}
                    onClick={() => setDroneType("root")}
                    className="flex-1"
                  >
                    Root note
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            className="w-full h-14 text-lg font-semibold mt-6"
            onClick={handleStart}
            disabled={selectedNotes.length < 2 || isPreloading}
          >
            {showLoadingIndicator ? "Loading sounds..." : "Start Practice"}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default SettingsView;
