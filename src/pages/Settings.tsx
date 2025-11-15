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
  semitonesToSolfege,
  semitonesToOneOctave,
  formatInstrumentName,
} from "@/utils/audio";
import {
  ConfigData,
  CONSTRAINTS,
  ExerciseType,
} from "@/config/ConfigData";
import { getFavouriteInstruments, saveFavouriteInstruments } from "@/utils/instrumentStorage";
import {
  getSavedConfigurations,
  saveConfiguration,
  deleteConfiguration,
  loadConfiguration,
  getCurrentConfiguration,
  saveCurrentConfiguration,
  SavedConfiguration,
  getLastExerciseType,
} from "@/utils/settingsStorage";
import { InstrumentSelector } from "@/components/InstrumentSelector";

const SettingsView = () => {
  const navigate = useNavigate();
  
  // Load current configuration for initial exercise type or use defaults
  const initialExerciseType = getLastExerciseType();
  const currentConfig = getCurrentConfiguration(initialExerciseType);
  const defaults = currentConfig || ConfigData.getDefaults(initialExerciseType);
  
  const [exerciseType, setExerciseType] = useState<ExerciseType>(defaults.exerciseType);
  
  // Load settings when exercise type changes
  useEffect(() => {
    const savedConfig = getCurrentConfiguration(exerciseType);
    const configToUse = savedConfig || ConfigData.getDefaults(exerciseType);
    
    setSelectedNotes(configToUse.selectedNotes);
    setNumberOfNotes(configToUse.numberOfNotes);
    setPlayExtraNotes(configToUse.playExtraNotes);
    setConsecutiveIntervals(configToUse.consecutiveIntervals);
    setQuestionNoteRange(configToUse.questionNoteRange);
    setTargetInterval(configToUse.intervalToFind);
    setIntervalComparisonRange(configToUse.intervalComparisonRange);
    setIntervalDirection(configToUse.intervalDirection);
    setTempo(configToUse.tempo);
    setRhythm(configToUse.rhythm);
    setDroneType(configToUse.droneType);
    setReferenceType(configToUse.referenceType);
    setRootNotePitch(configToUse.rootNotePitch);
    setSelectedInstrument(configToUse.instrument);
    setInstrumentMode(configToUse.instrumentMode);
  }, [exerciseType]);
  const [selectedNotes, setSelectedNotes] = useState<number[]>(defaults.selectedNotes);
  const [numberOfNotes, setNumberOfNotes] = useState(defaults.numberOfNotes);
  const [playExtraNotes, setPlayExtraNotes] = useState(defaults.playExtraNotes);
  const [consecutiveIntervals, setConsecutiveIntervals] = useState<[SemitoneOffset, SemitoneOffset]>(defaults.consecutiveIntervals);
  const [questionNoteRange, setQuestionNoteRange] = useState<[SemitoneOffset, SemitoneOffset]>(defaults.questionNoteRange);
  const [intervalToFind, setTargetInterval] = useState<SemitoneOffset>(defaults.intervalToFind);
  const [intervalComparisonRange, setIntervalComparisonRange] = useState<[SemitoneOffset, SemitoneOffset]>(defaults.intervalComparisonRange);
  const [intervalDirection, setIntervalDirection] = useState<'random' | 'ascending' | 'descending'>(defaults.intervalDirection);
  const [tempo, setTempo] = useState(defaults.tempo);
  const [rhythm, setRhythm] = useState(defaults.rhythm);
  const [droneType, setDroneType] = useState(defaults.droneType);
  const [referenceType, setReferenceType] = useState(defaults.referenceType);
  const [rootNotePitch, setRootNotePitch] = useState(defaults.rootNotePitch);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(defaults.instrument);
  const [instrumentMode, setInstrumentMode] = useState<"single" | "random">(defaults.instrumentMode);
  const [favouriteInstruments, setFavouriteInstruments] = useState<string[]>(getFavouriteInstruments());
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [instrumentDialogOpen, setInstrumentDialogOpen] = useState(false);
  const [isPreviewingInstrument, setIsPreviewingInstrument] = useState(false);

  const [isAudioLoading, setAudioLoading] = useState(false);
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

  const getCurrentSettings = (): ConfigData => {
    return new ConfigData({
      exerciseType,
      selectedNotes,
      numberOfNotes: exerciseType !== ExerciseType.SingleNoteRecognition ? numberOfNotes : 1,
      playExtraNotes,
      consecutiveIntervals,
      questionNoteRange,
      intervalToFind,
      intervalComparisonRange,
      intervalDirection,
      tempo,
      rhythm,
      droneType,
      referenceType,
      rootNotePitch,
      instrument: selectedInstrument,
      instrumentMode,
    });
  };

  const loadConfig = (id: string) => {
    const settings = loadConfiguration(id);
    if (!settings) return;
    
    setExerciseType(settings.exerciseType);
    setSelectedNotes(settings.selectedNotes);
    setNumberOfNotes(settings.numberOfNotes);
    setPlayExtraNotes(settings.playExtraNotes);
    setConsecutiveIntervals(settings.consecutiveIntervals);
    setQuestionNoteRange(settings.questionNoteRange);
    setTargetInterval(settings.intervalToFind);
    setIntervalComparisonRange(settings.intervalComparisonRange);
    setIntervalDirection(settings.intervalDirection);
    setTempo(settings.tempo);
    setRhythm(settings.rhythm);
    setDroneType(settings.droneType);
    setReferenceType(settings.referenceType);
    setRootNotePitch(settings.rootNotePitch);
    setSelectedInstrument(settings.instrument);
    setInstrumentMode(settings.instrumentMode);
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
    
    setAudioLoading(true);
    
    // Show loading indicator only if preload takes more than 400ms
    const loadingTimer = setTimeout(() => {
      setShowLoadingIndicator(true);
    }, 400);
    
    try {
      const currentSettings = getCurrentSettings();
      const instrumentToPreload = currentSettings.pickInstrument(favouriteInstruments);
      
      // Preload with user gesture from button click
      await preloadInstrumentWithGesture(instrumentToPreload);
      clearTimeout(loadingTimer);
      setShowLoadingIndicator(false);
      setAudioLoading(false);
      
      // Save current configuration so practice can restore later
      saveCurrentConfiguration(currentSettings);
      
      // Encode settings as query params and navigate
      const queryParams = currentSettings.toQueryParams();
      queryParams.set('preloaded', 'true');
      const route = currentSettings.exerciseType === ExerciseType.IntervalComparison 
        ? '/interval-comparison'
        : '/practice';
      let queryString = queryParams.toString();
      // Just to make them URLs more readable, reverse the overzealous/unnecessary escaping of commas
      while (queryString.indexOf('%2C')>=0) 
        queryString = queryString.replace('%2C', ',');
      navigate(`${route}?${queryString}`);
    } catch (e) {
      clearTimeout(loadingTimer);
      setShowLoadingIndicator(false);
      setAudioLoading(false);
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
    const noteInOctave = semitonesToOneOctave(semitones);
    const noteName = semitonesToSolfege(noteInOctave);
    
    if (octaveOffset === -1) return `${noteName} (-1 octave)`;
    if (octaveOffset === 0) return `${noteName} (main octave)`;
    if (octaveOffset === 1) return `${noteName} (+1 octave)`;
    if (octaveOffset === 2) return `${noteName} (+2 octaves)`;
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
          <Button 
            variant="ghost" 
            className="absolute right-16 top-4 h-20 w-24 p-2 rounded-md hover:bg-accent/40"
            onClick={() => navigate("/keyboard")}
            aria-label="Open Solfege Keyboard"
            title="Solfege Keyboard"
          >
            <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id="lt-notes" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--brand-cyan))" />
                  <stop offset="50%" stopColor="hsl(var(--brand-magenta))" />
                  <stop offset="100%" stopColor="hsl(var(--brand-lime))" />
                </linearGradient>
              </defs>
              <rect x="2" y="8" width="116" height="64" rx="8" fill="hsl(var(--card))" stroke="url(#lt-notes)" strokeWidth="6" />
              <g stroke="hsl(var(--border))" strokeWidth="2">
                <line x1="19" y1="8" x2="19" y2="72" />
                <line x1="36" y1="8" x2="36" y2="72" />
                <line x1="53" y1="8" x2="53" y2="72" />
                <line x1="70" y1="8" x2="70" y2="72" />
                <line x1="87" y1="8" x2="87" y2="72" />
                <line x1="104" y1="8" x2="104" y2="72" />
              </g>
              <g fill="url(#lt-notes)">
                <rect x="26" y="8" width="10" height="36" rx="2" />
                <rect x="43" y="8" width="10" height="36" rx="2" />
                <rect x="77" y="8" width="10" height="36" rx="2" />
                <rect x="94" y="8" width="10" height="36" rx="2" />
                <rect x="108" y="8" width="10" height="36" rx="2" />
              </g>
            </svg>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-10 w-10">
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
          <CardTitle className="text-3xl font-bold" title="Copyright (C) Ben Spiller 2025-present">LearnTiDo</CardTitle>
          <CardDescription>Functional ear practice with solfege keyboard</CardDescription>
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
                  const isMatching = getCurrentSettings().equals(config.settings);
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
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
            </TabsList>

            <TabsContent value="practice" className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Exercise</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={exerciseType === ExerciseType.MelodyRecognition ? "default" : "outline"}
                    onClick={() => setExerciseType(ExerciseType.MelodyRecognition)}
                    className="flex-1"
                  >
                    {ExerciseType.MelodyRecognition}
                  </Button>
                  <Button
                    variant={exerciseType === ExerciseType.SingleNoteRecognition ? "default" : "outline"}
                    onClick={() => setExerciseType(ExerciseType.SingleNoteRecognition)}
                    className="flex-1"
                  >
                    {ExerciseType.SingleNoteRecognition}
                  </Button>
                  <Button
                    variant={exerciseType === ExerciseType.IntervalComparison ? "default" : "outline"}
                    onClick={() => setExerciseType(ExerciseType.IntervalComparison)}
                    className="flex-1"
                  >
                    {ExerciseType.IntervalComparison}
                  </Button>
                </div>
              </div>

              {exerciseType !== ExerciseType.SingleNoteRecognition && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Notes per question</Label>
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
            )}

            {exerciseType !== ExerciseType.IntervalComparison && (<>

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
                <Label className="text-base font-semibold">
                  Question note range: {formatQuestionRangeLabel(questionNoteRange[0])} ... {formatQuestionRangeLabel(questionNoteRange[1])}
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
              </div>
              </>)}

              {exerciseType === ExerciseType.IntervalComparison && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Target interval to find: {semitonesToInterval(intervalToFind)}
                  </Label>
                  <Slider
                    value={[intervalToFind]}
                    onValueChange={(values) => {
                      setTargetInterval(values[0] as SemitoneOffset);
                    }}
                    min={1}
                    max={12}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    {intervalComparisonRange[0] !== intervalComparisonRange[1] ?
                      `Comparison intervals: ${semitonesToInterval(intervalComparisonRange[0])} ... ${semitonesToInterval(intervalComparisonRange[1])}`
                      : `Comparison interval: ${semitonesToInterval(intervalComparisonRange[0])}`
                    }
                  </Label>
                  <Slider
                    value={intervalComparisonRange}
                    onValueChange={(values) => {
                      setIntervalComparisonRange([values[0], values[1]]);
                    }}
                    min={CONSTRAINTS.intervalComparisonRange.min}
                    max={CONSTRAINTS.intervalComparisonRange.max}
                    step={1}
                    minStepsBetweenThumbs={0}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Direction</Label>
                  <Select value={intervalDirection} onValueChange={(value: 'random' | 'ascending' | 'descending') => setIntervalDirection(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random each question</SelectItem>
                      <SelectItem value="ascending">Ascending (fixed for session)</SelectItem>
                      <SelectItem value="descending">Descending (fixed for session)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              )}

              {exerciseType !== ExerciseType.IntervalComparison && (
              <>
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
                <Label className="text-base font-semibold" title="Use this to focus on the common small intervals (e.g. 2 <= 4 semitones) until you've mastered the differences. Later you could use it to do focused practice on large intervals.">
                  Consecutive intervals: {semitonesToInterval(consecutiveIntervals[0])} ... {semitonesToInterval(consecutiveIntervals[1])}</Label>
                <Slider
                  value={consecutiveIntervals}
                  onValueChange={(values) => {
                    // Ensure min and max are always different
                    if (values[0] === values[1]) {
                      return;
                    }
                    setConsecutiveIntervals([values[0], values[1]]);
                  }}
                  min={CONSTRAINTS.consecutiveIntervals.min}
                  max={CONSTRAINTS.consecutiveIntervals.max}
                  step={1}
                  minStepsBetweenThumbs={1}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Background Drone</Label>
                <div className="flex gap-2">
                  <Button
                    variant={droneType === "none" ? "default" : "outline"}
                    onClick={() => setDroneType("none")}
                    className="flex-1"
                  >
                    Off
                  </Button>
                  <Button
                    variant={droneType === "root" ? "default" : "outline"}
                    onClick={() => setDroneType("root")}
                    className="flex-1"
                  >
                    Root note (do)
                  </Button>
                </div>
              </div>
              </>
              )}

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
                      setIsPreviewingInstrument(true);
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
                      setIsPreviewingInstrument(false);
                    }
                  }}
                  instrumentMode={instrumentMode}
                  onInstrumentModeChange={setInstrumentMode}
                  favouriteInstruments={favouriteInstruments}
                  onFavouriteInstrumentsChange={(favourites) => {
                    setFavouriteInstruments(favourites);
                    saveFavouriteInstruments(favourites);
                  }}
                />
              </div>

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
                <Label className="text-base font-semibold">Tempo: {tempo} BPM</Label>
                <Slider
                  value={[tempo]}
                  onValueChange={(v) => setTempo(v[0])}
                  min={CONSTRAINTS.tempo.min}
                  max={CONSTRAINTS.tempo.max}
                  step={CONSTRAINTS.tempo.step}
                />
              </div>

              {/* <div className="space-y-4">
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
              </div> */}


            </TabsContent>
          </Tabs>

          <Button
            className="w-full h-14 text-lg font-semibold mt-6"
            onClick={handleStart}
            disabled={selectedNotes.length < 2 || isAudioLoading}
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
