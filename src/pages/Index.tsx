import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SettingsData } from "@/config/practiceSettings";
import { getSavedConfigurations, saveConfiguration, deleteConfiguration, SavedConfiguration } from "@/utils/settingsStorage";

const Index = () => {
  const navigate = useNavigate();
  const [savedConfigs, setSavedConfigs] = useState<SavedConfiguration[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [configName, setConfigName] = useState("");

  useEffect(() => {
    setSavedConfigs(getSavedConfigurations());
  }, []);

  const handleLoadConfig = (configId: string) => {
    setSelectedConfigId(configId);
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      navigate("/settings", { state: { loadConfig: config } });
    }
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
    
    const defaultSettings = new SettingsData();
    saveConfiguration(configName.trim(), defaultSettings);
    setSavedConfigs(getSavedConfigurations());
    setConfigName("");
    setSaveDialogOpen(false);
    
    toast({
      title: "Configuration Saved",
      description: `"${configName.trim()}" has been saved.`,
    });
  };

  const handleDeleteConfig = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Music className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div>
          <h1 className="text-4xl font-bold mb-2">LearnTiDo</h1>
          <p className="text-muted-foreground">Practice your solfege skills</p>
        </div>

        {savedConfigs.length > 0 && (
          <div className="space-y-3 pt-4">
            <Label className="text-sm font-medium">Load Configuration</Label>
            <div className="flex gap-2">
              <Select value={selectedConfigId} onValueChange={handleLoadConfig}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a configuration..." />
                </SelectTrigger>
                <SelectContent>
                  {savedConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{config.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-2"
                          onClick={(e) => handleDeleteConfig(config.id, config.name, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Configuration</DialogTitle>
                    <DialogDescription>
                      Save current settings for quick access later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="config-name">Configuration Name</Label>
                      <Input
                        id="config-name"
                        placeholder="e.g., Fast Practice"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveConfig()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveConfig}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button 
            onClick={() => navigate("/settings")} 
            size="lg"
            className="w-full"
          >
            {savedConfigs.length > 0 ? "New Practice Session" : "Get Started"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
