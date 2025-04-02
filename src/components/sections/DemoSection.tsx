
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AIAssistant } from "@/components/features/AIAssistant";
import { TranscriptionPanel } from "@/components/features/TranscriptionPanel";

export function DemoSection() {
  return (
    <section className="py-12 md:py-24 bg-accent/25" id="demo">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center mb-12">
          <div className="inline-block rounded-full bg-meetassist-light px-3 py-1 text-sm text-meetassist-primary">
            How It Works
          </div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-heading">
            See Conversa Meet in Action
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Experience the power of real-time transcription and AI assistance
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div>
            <h3 className="text-xl font-medium mb-4">Real-time Transcription</h3>
            <TranscriptionPanel />
          </div>
          
          <div>
            <h3 className="text-xl font-medium mb-4">AI Assistant</h3>
            <AIAssistant />
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <Card className="p-6 bg-gradient-to-r from-meetassist-primary to-meetassist-tertiary text-white">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Ready to transform your meetings?</h3>
              <p className="opacity-90">
                Install the Conversa Meet extension now and experience more productive meetings.
              </p>
              <Button size="lg" variant="outline" className="bg-white text-meetassist-primary hover:bg-white/90 hover:text-meetassist-secondary border-none">
                Install Chrome Extension
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
