import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Music } from "lucide-react";
import {
  setInstrument,
  preloadInstrumentWithGesture,
} from "@/utils/audio";
import {
  DEFAULT_SETTINGS,
  SOLFEGE_TO_INTERVAL,
  INTERVAL_TO_SOLFEGE,
  SOLFEGE_NOTES,
  INSTRUMENT_OPTIONS,
  ROOT_NOTE_OPTIONS,
  CONSTRAINTS,
} from "@/config/practiceSettings";

const Settings = () => {
  const navigate = useNavigate();
  const [selectedNotes, setSelectedNotes] = useState<number[]>(DEFAULT_SETTINGS.selectedNotes);
  const [numberOfNotes, setNumberOfNotes] = useState(DEFAULT_SETTINGS.numberOfNotes);
  const [intervalRange, setIntervalRange] = useState([DEFAULT_SETTINGS.minInterval, DEFAULT_SETTINGS.maxInterval]);
  const [tempo, setTempo] = useState(DEFAULT_SETTINGS.tempo);
  const [rhythm, setRhythm] = useState<"fixed" | "random">(DEFAULT_SETTINGS.rhythm);
  const [referencePlay, setReferencePlay] = useState<"once" | "drone">(DEFAULT_SETTINGS.referencePlay);
  const [referenceType, setReferenceType] = useState<"root" | "arpeggio">(DEFAULT_SETTINGS.referenceType);
  const [rootNotePitch, setRootNotePitch] = useState(DEFAULT_SETTINGS.rootNotePitch);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(
    () => localStorage.getItem('learn-ti-do.instrument') || DEFAULT_SETTINGS.instrument
  );
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
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
  );
};

export default Settings;
