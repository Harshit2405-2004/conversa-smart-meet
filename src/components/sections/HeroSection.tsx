
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, FileText, MessageSquare } from "lucide-react";

export function HeroSection() {
  return (
    <section className="py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-8 text-center">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-6xl/none gradient-heading animate-fade-in">
              Transform Your Google Meet Experience
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl animate-fade-in" style={{animationDelay: "0.2s"}}>
              Real-time transcription, AI-powered assistance, and smart meeting summaries 
              to help you stay focused and never miss important details again.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in" style={{animationDelay: "0.4s"}}>
            <Button size="lg" className="bg-meetassist-primary hover:bg-meetassist-secondary">
              Install Extension <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg">
              Watch Demo
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-12 animate-fade-in" style={{animationDelay: "0.6s"}}>
            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <div className="p-3 rounded-full bg-meetassist-light">
                <FileText className="h-6 w-6 text-meetassist-primary" />
              </div>
              <h3 className="text-lg font-medium">Real-time Transcription</h3>
              <p className="text-sm text-muted-foreground">
                Capture every word with accurate, live meeting transcripts
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <div className="p-3 rounded-full bg-meetassist-light">
                <Bot className="h-6 w-6 text-meetassist-primary" />
              </div>
              <h3 className="text-lg font-medium">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Get instant answers and insights during your meetings
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-2 p-4">
              <div className="p-3 rounded-full bg-meetassist-light">
                <MessageSquare className="h-6 w-6 text-meetassist-primary" />
              </div>
              <h3 className="text-lg font-medium">Meeting Summaries</h3>
              <p className="text-sm text-muted-foreground">
                Auto-generate structured summaries with key points and action items
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
