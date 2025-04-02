
import { Card, CardContent } from "@/components/ui/card";
import { FEATURES } from "@/lib/mock-data";
import { Bot, FileText, MessageSquare, Search, Users, Lock } from "lucide-react";

const featureIcons = {
  "Real-Time Transcription": <FileText className="h-6 w-6 text-meetassist-primary" />,
  "AI Assistant": <Bot className="h-6 w-6 text-meetassist-primary" />,
  "Speaker Identification": <Users className="h-6 w-6 text-meetassist-primary" />,
  "Searchable Transcripts": <Search className="h-6 w-6 text-meetassist-primary" />,
  "Meeting Summaries": <MessageSquare className="h-6 w-6 text-meetassist-primary" />,
  "Private & Secure": <Lock className="h-6 w-6 text-meetassist-primary" />
};

export function FeaturesSection() {
  return (
    <section className="py-12 md:py-24 bg-accent/25" id="features">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center mb-12">
          <div className="inline-block rounded-full bg-meetassist-light px-3 py-1 text-sm text-meetassist-primary">
            Features
          </div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-heading">
            Everything You Need for Better Meetings
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-xl">
            Powerful tools to enhance your Google Meet experience and boost productivity
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <Card key={index} className="bg-card border-primary/10 hover:shadow-md transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-3">
                  <div className="p-2 w-fit rounded-full bg-meetassist-light">
                    {featureIcons[feature.title as keyof typeof featureIcons]}
                  </div>
                  <h3 className="text-lg font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
