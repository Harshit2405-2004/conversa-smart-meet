
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranscriptionPanel } from "@/components/features/TranscriptionPanel";
import { AIAssistant } from "@/components/features/AIAssistant";
import { TranscriptList } from "@/components/features/TranscriptList";
import { AnalyticsDashboard } from "@/components/features/AnalyticsDashboard";
import { BarChart2 } from "lucide-react";

export function DashboardContent() {
  return (
    <div className="container py-6 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
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
