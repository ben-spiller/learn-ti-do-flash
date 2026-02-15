import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Shuffle } from "lucide-react";
import { getGlobalSettings, saveGlobalSettings, ReferenceType } from "@/utils/globalSettingsStorage";
import { InstrumentSelector } from "@/components/InstrumentSelector";
import { formatInstrumentName, preloadInstrumentWithGesture, noteNameToMidi, playSequence, stopSounds } from "@/utils/audio";
import { toast } from "sonner";

const GlobalSettings = () => {
  const navigate = useNavigate();
  const globalSettings = getGlobalSettings();
  const [referenceType, setReferenceType] = useState<ReferenceType>(globalSettings.referenceType);
  const [instrumentMode, setInstrumentMode] = useState<"single" | "random">(globalSettings.instrumentMode);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(globalSettings.selectedInstrument);
  const [favouriteInstruments, setFavouriteInstruments] = useState<string[]>(globalSettings.favouriteInstruments);
  const [instrumentDialogOpen, setInstrumentDialogOpen] = useState(false);

  const handleSave = () => {
    saveGlobalSettings({ referenceType, instrumentMode, selectedInstrument, favouriteInstruments });
    toast.success("Global settings saved");
    navigate("/");
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            These settings apply to all exercise types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="referenceType">Reference Type</Label>
            <Select
              value={referenceType}
              onValueChange={(value) => setReferenceType(value as ReferenceType)}
            >
              <SelectTrigger id="referenceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="root">Root Note</SelectItem>
                <SelectItem value="arpeggio">Arpeggio</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {referenceType === "none" && "No reference sound"}
              {referenceType === "root" && "Play root note before each question"}
              {referenceType === "arpeggio" && "Play major arpeggio before each question"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Instrument</Label>
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
                  try {
                    stopSounds();
                    await preloadInstrumentWithGesture(instrument);
                    const rootMidi = noteNameToMidi("C4");
                    await playSequence([
                      { note: rootMidi, duration: 0.3, gapAfter: 0.1 },
                      { note: rootMidi + 4, duration: 0.3, gapAfter: 0.1 },
                      { note: rootMidi + 7, duration: 0.3, gapAfter: 0.1 },
                      { note: rootMidi + 12, duration: 0.5, gapAfter: 0 },
                    ]);
                  } catch (_) {}
                }
              }}
              instrumentMode={instrumentMode}
              onInstrumentModeChange={setInstrumentMode}
              favouriteInstruments={favouriteInstruments}
              onFavouriteInstrumentsChange={setFavouriteInstruments}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Global Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalSettings;
