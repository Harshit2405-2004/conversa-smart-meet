
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Download, Copy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { audioRecorder, blobToBase64 } from "@/lib/audio-utils";

export function TranscriptionPanel() {
  const { toast } = useToast();
  const { 
    isTranscribing, 
    startTranscription: startTranscriptionStore, 
    stopTranscription: stopTranscriptionStore,
    user,
    currentTranscript,
    setCurrentTranscriptId
  } = useStore();
  
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Handle recording state changes
  useEffect(() => {
    if (isTranscribing) {
      startRecording();
    } else if (recordedBlob) {
      processRecording();
    }
  }, [isTranscribing]);

  const startRecording = () => {
    setErrorMessage(null);
    audioRecorder.startRecording({
      onStart: () => {
        startTranscriptionStore();
        setRecordingDuration(0);
        setRecordedBlob(null);
      },
      onError: (error) => {
        toast({
          title: "Recording Error",
          description: error,
          variant: "destructive"
        });
        setErrorMessage(error);
        stopTranscriptionStore();
      },
      onStop: (blob, duration) => {
        setRecordedBlob(blob);
        setRecordingDuration(duration);
      }
    });
  };

  const startTranscription = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the transcription feature.",
        variant: "destructive"
      });
      return;
    }
    
    if (user.remainingTranscription <= 0) {
      toast({
        title: "No Minutes Remaining",
        description: "You've used all your transcription minutes. Please upgrade your plan.",
        variant: "destructive"
      });
      return;
    }
    
    startTranscriptionStore();
  };

  const stopTranscription = () => {
    audioRecorder.stopRecording();
    stopTranscriptionStore();
  };

  const processRecording = async () => {
    if (!recordedBlob) return;
    
    setIsProcessing(true);
    
    try {
      // Convert the audio blob to base64
      const base64Audio = await blobToBase64(recordedBlob);
      
      // Call the Google Speech-to-Text edge function
      const { data, error } = await supabase.functions.invoke('google-transcribe', {
        body: { 
          audioData: base64Audio,
          recordingDuration
        }
      });
      
      if (error) {
        throw new Error(`Error processing audio: ${error.message}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update the remaining transcription minutes in the user state
      if (data.remaining_minutes !== undefined && user) {
        // This will be handled by the store
      }
      
      // Update the current transcript
      if (data.transcript_id) {
        setCurrentTranscriptId(data.transcript_id);
        
        toast({
          title: "Transcription Complete",
          description: `Used ${data.minutes_used} minute${data.minutes_used === 1 ? '' : 's'} of transcription.`,
        });
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Transcription Failed",
        description: error.message || "An unexpected error occurred while processing your recording.",
        variant: "destructive"
      });
      setErrorMessage(error.message || "Failed to transcribe audio");
    } finally {
      setIsProcessing(false);
      setRecordedBlob(null);
    }
  };

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
                : isProcessing
                  ? "Processing your recording..."
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
              disabled={isProcessing}
            >
              {isTranscribing ? (
                <>
                  <MicOff size={16} />
                  Stop
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
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
        ) : isProcessing ? (
          <div className="h-[300px] flex items-center justify-center border rounded-lg">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">
                Processing your recording with Google Speech-to-Text...<br />
                This may take a moment.
              </p>
            </div>
          </div>
        ) : currentTranscript.length > 0 ? (
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
        ) : errorMessage ? (
          <div className="h-[300px] flex items-center justify-center border rounded-lg">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 text-destructive">⚠️</div>
              <p className="text-sm text-destructive">
                {errorMessage}<br />
                Please try again.
              </p>
            </div>
          </div>
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
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={currentTranscript.length === 0 || isProcessing}
        >
          <Copy size={16} className="mr-2" />
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={currentTranscript.length === 0 || isProcessing}
        >
          <Download size={16} className="mr-2" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
