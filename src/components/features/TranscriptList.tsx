
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_TRANSCRIPTS } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";
import { Clock, FileText } from "lucide-react";

export function TranscriptList() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle>Recent Transcripts</CardTitle>
        <CardDescription>
          Access your recent meeting transcriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {MOCK_TRANSCRIPTS.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText size={32} className="text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No transcripts available yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {MOCK_TRANSCRIPTS.map((transcript) => (
                <Card key={transcript.id} className="overflow-hidden hover:shadow-md transition-all">
                  <a href="#" className="block p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{transcript.title}</h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Clock size={12} className="mr-1" />
                          <span>{formatDistanceToNow(new Date(transcript.date), { addSuffix: true })}</span>
                          <span className="mx-2">•</span>
                          <span>{transcript.duration} minutes</span>
                        </div>
                      </div>
                      <span className="bg-accent/50 text-xs px-2 py-1 rounded">
                        {transcript.content.length} segments
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {transcript.content[0].speaker}: "{transcript.content[0].text}"
                    </p>
                  </a>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
