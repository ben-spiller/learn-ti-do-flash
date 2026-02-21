import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AboutDialog = ({ open, onOpenChange }: AboutDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>About Me-Do-Solfege</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="readme" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="readme" className="flex-1">About</TabsTrigger>
            <TabsTrigger value="license" className="flex-1">License</TabsTrigger>
          </TabsList>
          <TabsContent value="readme" className="flex-1 min-h-0">
            <ScrollArea className="h-[55vh]">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono p-4">
                {__README_MD__}
              </pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="license" className="flex-1 min-h-0">
            <ScrollArea className="h-[55vh]">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono p-4">
                {__LICENSE__}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <p>Last updated: {__BUILD_TIMESTAMP__}</p>
        <p>
          <a
            href="https://github.com/ben-spiller/me-do-solfege/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: 'hsl(var(--primary))' }}
          >
            See GitHub
          </a>
          {' '}for source code
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AboutDialog;
