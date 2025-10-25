import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { INSTRUMENT_OPTIONS, formatInstrumentName } from "@/config/ConfigData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music, Shuffle } from "lucide-react";
import { setInstrument, playNote, noteNameToMidi } from "@/utils/audio";

interface InstrumentSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedInstrument: string;
  onInstrumentChange: (instrument: string) => void;
  instrumentMode: "single" | "random";
  onInstrumentModeChange: (mode: "single" | "random") => void;
  favouriteInstruments: string[];
  onFavouriteInstrumentsChange: (favourites: string[]) => void;
}

export function InstrumentSelector({
  open,
  onOpenChange,
  selectedInstrument,
  onInstrumentChange,
  instrumentMode,
  onInstrumentModeChange,
  favouriteInstruments,
  onFavouriteInstrumentsChange,
}: InstrumentSelectorProps) {
  const [localMode, setLocalMode] = useState(instrumentMode);
  const [localInstrument, setLocalInstrument] = useState(selectedInstrument);
  const [localFavourites, setLocalFavourites] = useState(favouriteInstruments);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playPreview = async (instrumentSlug: string) => {
    // Clear any pending preview
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Debounce: schedule the preview to play after a short delay
    previewTimeoutRef.current = setTimeout(async () => {
      await setInstrument(instrumentSlug);
      playNote(noteNameToMidi("C4"), 0.6); // Play middle C
    }, 100);
  };

  const handleSave = () => {
    onInstrumentModeChange(localMode);
    onInstrumentChange(localInstrument);
    onFavouriteInstrumentsChange(localFavourites);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Clear any pending preview
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    // Reset to original values
    setLocalMode(instrumentMode);
    setLocalInstrument(selectedInstrument);
    setLocalFavourites(favouriteInstruments);
    onOpenChange(false);
  };

  const toggleFavourite = (slug: string) => {
    const willBeSelected = !localFavourites.includes(slug);
    setLocalFavourites(prev =>
      prev.includes(slug)
        ? prev.filter(f => f !== slug)
        : [...prev, slug]
    );
    
    // Play preview when selecting (but not when deselecting)
    if (willBeSelected) {
      playPreview(slug);
    }
  };

  const selectAllFavourites = () => {
    setLocalFavourites(INSTRUMENT_OPTIONS.map(opt => opt.slug));
  };

  const selectNoneFavourites = () => {
    setLocalFavourites([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Instrument Configuration</DialogTitle>
          <DialogDescription>
            Choose between a single instrument or random selection from favourites
          </DialogDescription>
        </DialogHeader>

        <Tabs value={localMode} onValueChange={(v) => setLocalMode(v as "single" | "random")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Single Instrument
            </TabsTrigger>
            <TabsTrigger value="random" className="flex items-center gap-2">
              <Shuffle className="h-4 w-4" />
              Random from Favourites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Instrument</Label>
              <select
                value={localInstrument}
                onChange={(e) => setLocalInstrument(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <option key={opt.slug} value={opt.slug}>{opt.label}</option>
                ))}
              </select>
            </div>
          </TabsContent>

          <TabsContent value="random" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Favourite Instruments ({localFavourites.length} selected)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllFavourites}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectNoneFavourites}
                  >
                    Select None
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-3">
                  {INSTRUMENT_OPTIONS.map((opt) => (
                    <div key={opt.slug} className="flex items-center space-x-2">
                      <Checkbox
                        id={opt.slug}
                        checked={localFavourites.includes(opt.slug)}
                        onCheckedChange={() => toggleFavourite(opt.slug)}
                      />
                      <label
                        htmlFor={opt.slug}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {localFavourites.length === 0 && (
                <p className="text-sm text-destructive">
                  Please select at least one favourite instrument
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={localMode === "random" && localFavourites.length === 0}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
