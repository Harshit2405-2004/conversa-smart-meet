
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranscriptionPanel } from "@/components/features/TranscriptionPanel";
import { AIAssistant } from "@/components/features/AIAssistant";
import { TranscriptList } from "@/components/features/TranscriptList";
import { AnalyticsDashboard } from "@/components/features/AnalyticsDashboard";
import { BarChart2, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function DashboardContent() {
  const [isChrome, setIsChrome] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser is Chrome/Chromium-based
    const isChromeBrowser = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    setIsChrome(isChromeBrowser);
  }, []);

  const handleInstallExtension = () => {
    // Chrome Web Store URL - update this with your actual Web Store URL when published
    const extensionUrl = "https://chrome.google.com/webstore/detail/meetassist-ai-meeting-ass/YOUR_EXTENSION_ID_HERE";
    window.open(extensionUrl, '_blank');
    
    toast({
      title: "Installing Extension",
      description: "Follow the prompts in the Chrome Web Store to install MeetAssist.",
    });
  };

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        {isChrome && (
          <Button 
            onClick={handleInstallExtension}
            className="bg-meetassist-primary hover:bg-meetassist-secondary flex items-center"
          >
            <Chrome className="mr-2 h-5 w-5" /> Install Chrome Extension
          </Button>
        )}
      </div>
      
      {!isChrome && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <p className="text-sm">
            MeetAssist works best with Chrome or Chromium-based browsers. Please switch to a supported browser to install the extension.
          </p>
        </div>
      )}
      
      <Tabs defaultValue="transcribe">
        <TabsList>
          <TabsTrigger value="transcribe">Transcribe</TabsTrigger>
          <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart2 size={16} />
            Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transcribe" className="pt-4">
          <div className="space-y-6">
            <TranscriptionPanel />
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> In the full extension, this would directly 
                integrate with Google Meet to provide live transcription.
              </p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="assistant" className="pt-4">
          <AIAssistant />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <TranscriptList />
        </TabsContent>
        <TabsContent value="analytics" className="pt-4">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
