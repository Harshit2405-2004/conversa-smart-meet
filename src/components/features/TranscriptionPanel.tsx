
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Download, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TranscriptionPanel() {
  const { toast } = useToast();
  const { 
    isTranscribing, 
    startTranscription, 
    stopTranscription,
    user,
    currentTranscript
  } = useStore();
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    const text = currentTranscript.map(segment => 
      `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Transcript has been copied to your clipboard."
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = currentTranscript.map(segment => 
      `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`
    ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Transcript downloaded",
      description: "Your transcript file has been downloaded."
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Transcription</CardTitle>
            <CardDescription>
              {isTranscribing 
                ? "Transcribing your meeting in real-time" 
                : "Start transcription to capture your meeting"}
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {user && (
              <Badge variant="outline" className="ml-2">
                {user.remainingTranscription} mins left
              </Badge>
            )}
            <Button 
              onClick={isTranscribing ? stopTranscription : startTranscription}
              variant={isTranscribing ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isTranscribing ? (
                <>
                  <MicOff size={16} />
                  Stop
                </>
              ) : (
                <>
                  <Mic size={16} />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isTranscribing ? (
          <div className="min-h-[300px] p-4 rounded-lg border bg-accent/50">
            <div className="animate-pulse-light flex items-center space-x-2 mb-4">
              <div className="h-3 w-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium">Recording...</span>
            </div>
            
            <p className="text-sm text-muted-foreground typing-indicator">
              Transcription will appear here as people speak
            </p>
          </div>
        ) : (
          currentTranscript.length > 0 ? (
            <ScrollArea className="h-[300px] rounded-lg border p-4">
              {currentTranscript.map((segment, index) => (
                <div key={index} className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                    <span className="font-medium text-sm">{segment.speaker}</span>
                  </div>
                  <p className="pl-14">{segment.text}</p>
                </div>
              ))}
            </ScrollArea>
          ) : (
            <div className="h-[300px] flex items-center justify-center border rounded-lg">
              <div className="text-center">
                <Mic className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No transcription available yet.<br />
                  Click "Start" to begin transcribing your meeting.
                </p>
              </div>
            </div>
          )
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={currentTranscript.length === 0}
        >
          <Copy size={16} className="mr-2" />
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={currentTranscript.length === 0}
        >
          <Download size={16} className="mr-2" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
