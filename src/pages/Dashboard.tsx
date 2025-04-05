
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { TranscriptionPanel } from "@/components/features/TranscriptionPanel";
import { AIAssistant } from "@/components/features/AIAssistant";
import { TranscriptList } from "@/components/features/TranscriptList";
import { ExtensionManager } from "@/components/features/ExtensionManager";
import { TranscriptionControls } from "@/components/features/TranscriptionControls";

export default function Dashboard() {
  const { fetchTranscripts, user } = useStore();

  useEffect(() => {
    if (user) {
      fetchTranscripts();
    }
  }, [user, fetchTranscripts]);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <TranscriptionPanel />
          <AIAssistant />
        </div>
        <div className="space-y-6">
          <ExtensionManager />
          <TranscriptionControls />
          <TranscriptList />
        </div>
      </div>
    </div>
  );
}
