import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";

const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

const Settings = () => {
  const navigate = useNavigate();
  const [selectedNotes, setSelectedNotes] = useState<string[]>(["Do", "Re", "Mi"]);
  const [numberOfNotes, setNumberOfNotes] = useState(5);

  const handleNoteToggle = (note: string) => {
    setSelectedNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  };

  const handleStart = () => {
    if (selectedNotes.length < 2) {
      alert("Please select at least 2 notes to practice");
      return;
    }
    navigate("/practice", {
      state: { selectedNotes, numberOfNotes },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">LearnTiDo</CardTitle>
          <CardDescription>Practice your solfege skills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Notes to Practice</Label>
            <div className="space-y-3">
              {SOLFEGE_NOTES.map((note) => (
                <div key={note} className="flex items-center space-x-3">
                  <Checkbox
                    id={note}
                    checked={selectedNotes.includes(note)}
                    onCheckedChange={() => handleNoteToggle(note)}
                  />
                  <Label
                    htmlFor={note}
                    className="text-base cursor-pointer flex-1 py-2"
                  >
                    {note}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Number of Notes to Play</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNumberOfNotes(Math.max(2, numberOfNotes - 1))}
              >
                -
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold">{numberOfNotes}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNumberOfNotes(Math.min(10, numberOfNotes + 1))}
              >
                +
              </Button>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg font-semibold"
            onClick={handleStart}
            disabled={selectedNotes.length < 2}
          >
            Start Practice
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
