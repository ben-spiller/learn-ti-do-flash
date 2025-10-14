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
import { Music, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  setInstrument,
  preloadInstrumentWithGesture,
} from "@/utils/audio";
import {
  SettingsData,
  INSTRUMENT_OPTIONS,
  CONSTRAINTS,
} from "@/config/practiceSettings";
import {
  getSavedConfigurations,
  saveConfiguration,
  deleteConfiguration,
  loadConfiguration,
  SavedConfiguration,
} from "@/utils/settingsStorage";

const SettingsView = () => {
  const navigate = useNavigate();
  const defaults = new SettingsData();
  const [selectedNotes, setSelectedNotes] = useState<number[]>(defaults.selectedNotes);
  const [numberOfNotes, setNumberOfNotes] = useState(defaults.numberOfNotes);
  const [intervalRange, setIntervalRange] = useState([defaults.minInterval, defaults.maxInterval]);
  const [tempo, setTempo] = useState(defaults.tempo);
  const [rhythm, setRhythm] = useState<"fixed" | "random">(defaults.rhythm);
  const [referencePlay, setReferencePlay] = useState<"once" | "drone">(defaults.referencePlay);
  const [referenceType, setReferenceType] = useState<"root" | "arpeggio">(defaults.referenceType);
  const [rootNotePitch, setRootNotePitch] = useState(defaults.rootNotePitch);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(
    () => localStorage.getItem('learn-ti-do.instrument') || defaults.instrument
  );
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
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

  const getCurrentSettings = (): SettingsData => {
    return new SettingsData({
      selectedNotes,
      numberOfNotes,
      minInterval: intervalRange[0],
      maxInterval: intervalRange[1],
      tempo,
      rhythm,
      referencePlay,
      referenceType,
      rootNotePitch,
      instrument: selectedInstrument,
    });
  };

  const loadConfig = (id: string) => {
    const settings = loadConfiguration(id);
    if (!settings) return;
    
    setSelectedNotes(settings.selectedNotes);
    setNumberOfNotes(settings.numberOfNotes);
    setIntervalRange([settings.minInterval, settings.maxInterval]);
    setTempo(settings.tempo);
    setRhythm(settings.rhythm);
    setReferencePlay(settings.referencePlay);
    setReferenceType(settings.referenceType);
    setRootNotePitch(settings.rootNotePitch);
    setSelectedInstrument(settings.instrument);
    
    toast({
      title: "Configuration Loaded",
      description: "Your settings have been updated.",
    });
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
      await preloadInstrumentWithGesture(selectedInstrument);
      clearTimeout(loadingTimer);
      setShowLoadingIndicator(false);
      setIsPreloading(false);
      
      navigate("/practice", {
        state: { 
          selectedNotes, 
          numberOfNotes,
          minInterval: intervalRange[0],
          maxInterval: intervalRange[1],
          tempo,
          rhythm,
          referencePlay,
          referenceType,
          rootNotePitch,
          preloaded: true
        },
      });
    } catch (e) {
      clearTimeout(loadingTimer);
      setShowLoadingIndicator(false);
      setIsPreloading(false);
    }
  };

  useEffect(() => {
    // Ensure we propagate the saved selection to the audio module
    (async () => {
      try {
        await setInstrument(selectedInstrument);
      } catch (_) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO: this is a crazy way to do it - refactor this to something more compact
  const SOLFEGE_TO_INTERVAL: Record<string, number> = {
    "Do": 0,
    "Re": 2,
    "Mi": 4,
    "Fa": 5,
    "Sol": 7,
    "La": 9,
    "Ti": 11,
  };

  const INTERVAL_TO_SOLFEGE: Record<number, string> = {
    0: "Do",
    2: "Re",
    4: "Mi",
    5: "Fa",
    7: "Sol",
    9: "La",
    11: "Ti",
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
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">LearnTiDo</CardTitle>
          <CardDescription>Configure your practice settings</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Saved Configurations - Card Grid */}
          {savedConfigs.length > 0 && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">My Configurations</Label>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
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
                        Save or update your practice settings configuration.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="config-select">Update Existing (optional)</Label>
                        <Select value={configName} onValueChange={setConfigName}>
                          <SelectTrigger id="config-select">
                            <SelectValue placeholder="Or select to update..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {savedConfigs.map((config) => (
                              <SelectItem key={config.id} value={config.name}>
                                {config.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="config-name">Configuration Name</Label>
                        <Input
                          id="config-name"
                          placeholder="e.g., Fast Practice, Beginner Mode"
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveConfig();
                            }
                          }}
                        />
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {savedConfigs.map((config) => (
                  <Card 
                    key={config.id} 
                    className={`relative cursor-pointer hover:border-primary transition-colors group ${selectedConfigId === config.id ? 'border-primary' : ''}`}
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
                ))}
              </div>
            </div>
          )}
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
                <Label className="text-base font-semibold">Consecutive Notes Interval Range: {intervalRange[0]} - {intervalRange[1]}</Label>
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
                <select
                  value={selectedInstrument}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setSelectedInstrument(v);
                    try {
                      localStorage.setItem('learn-ti-do.instrument', v);
                    } catch (_) {}
                    try {
                      await setInstrument(v);
                    } catch (_) {}
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {INSTRUMENT_OPTIONS.map((opt) => (
                    <option key={opt.slug} value={opt.slug}>{opt.label}</option>
                  ))}
                </select>
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
                <Label className="text-base font-semibold">Play Reference</Label>
                <div className="flex gap-2">
                  <Button
                    variant={referencePlay === "once" ? "default" : "outline"}
                    onClick={() => setReferencePlay("once")}
                    className="flex-1"
                  >
                    Once at Start
                  </Button>
                  <Button
                    variant={referencePlay === "drone" ? "default" : "outline"}
                    onClick={() => setReferencePlay("drone")}
                    className="flex-1"
                  >
                    Background Drone
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
