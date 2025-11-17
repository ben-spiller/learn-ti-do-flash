import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getGlobalSettings, saveGlobalSettings, ReferenceType } from "@/utils/globalSettingsStorage";
import { toast } from "sonner";

const GlobalSettings = () => {
  const navigate = useNavigate();
  const [referenceType, setReferenceType] = useState<ReferenceType>(getGlobalSettings().referenceType);

  const handleSave = () => {
    saveGlobalSettings({ referenceType });
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

          <Button onClick={handleSave} className="w-full">
            Save Global Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalSettings;
