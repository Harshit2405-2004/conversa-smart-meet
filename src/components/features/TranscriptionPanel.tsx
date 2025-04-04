
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Download, Copy, Loader2, Globe, ChevronDown, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { audioRecorder, blobToBase64 } from "@/lib/audio-utils";
import { supabase } from "@/integrations/supabase/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Supported languages
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'hi-IN', name: 'Hindi' }
];

// Collaboration tools
const EXPORT_TOOLS = [
  { id: 'googleDocs', name: 'Google Docs' },
  { id: 'notion', name: 'Notion' }
];

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
  const [selectedLanguage, setSelectedLanguage] = useState({ code: 'en-US', name: 'English (US)' });
  const [exporting, setExporting] = useState(false);
  const [isListeningForVoiceCommands, setIsListeningForVoiceCommands] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  
  useEffect(() => {
    if (isTranscribing) {
      startRecording();
    } else if (recordedBlob) {
      processRecording();
    }
  }, [isTranscribing]);
  
  // Initialize voice command recognition
  useEffect(() => {
    // Check if the browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      speechRecognitionRef.current = new SpeechRecognition();
      
      speechRecognitionRef.current.continuous = true;
      speechRecognitionRef.current.interimResults = false;
      
      speechRecognitionRef.current.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const command = event.results[i][0].transcript.trim().toLowerCase();
            handleVoiceCommand(command);
          }
        }
      };
      
      speechRecognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart listening if no speech was detected
          if (isListeningForVoiceCommands) {
            speechRecognitionRef.current.start();
          }
        } else {
          setIsListeningForVoiceCommands(false);
          toast({
            title: "Voice Command Error",
            description: `Error: ${event.error}. Voice commands have been disabled.`,
            variant: "destructive"
          });
        }
      };
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          // Ignore errors from stopping a non-started recognition
        }
      }
    };
  }, []);
  
  // Handle changes to voice command listening state
  useEffect(() => {
    if (speechRecognitionRef.current) {
      if (isListeningForVoiceCommands) {
        try {
          speechRecognitionRef.current.start();
          toast({
            title: "Voice Commands Activated",
            description: "Try saying: 'start recording', 'stop recording', 'download transcript', or 'copy transcript'",
          });
        } catch (e) {
          console.error('Error starting speech recognition:', e);
        }
      } else {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {
          // Ignore errors from stopping a non-started recognition
        }
      }
    }
  }, [isListeningForVoiceCommands]);
  
  const handleVoiceCommand = (command: string) => {
    console.log('Voice command detected:', command);
    
    if (command.includes('start') && command.includes('recording')) {
      startTranscription();
    } else if (command.includes('stop') && command.includes('recording')) {
      stopTranscription();
    } else if (command.includes('download') && command.includes('transcript')) {
      handleDownload();
    } else if (command.includes('copy') && command.includes('transcript')) {
      handleCopy();
    } else if ((command.includes('share') || command.includes('export')) && command.includes('google') && command.includes('docs')) {
      handleExport('googleDocs');
    } else if ((command.includes('share') || command.includes('export')) && command.includes('notion')) {
      handleExport('notion');
    }
  };

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
      const base64Audio = await blobToBase64(recordedBlob);
      
      // Log usage for analytics
      try {
        await supabase.functions.invoke('analytics-insights', {
          body: { 
            event: {
              type: 'transcription',
              language: selectedLanguage.code,
              duration: recordingDuration
            }
          }
        });
      } catch (error) {
        console.error('Error logging analytics:', error);
        // Continue even if analytics logging fails
      }
      
      // Use multi-language transcription endpoint
      const { data, error } = await supabase.functions.invoke('multi-language-transcribe', {
        body: { 
          audioData: base64Audio,
          recordingDuration,
          languageCode: selectedLanguage.code
        }
      });
      
      if (error) {
        throw new Error(`Error processing audio: ${error.message}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.remaining_minutes !== undefined && user) {
        // Update user data in store if needed
      }
      
      if (data.transcript_id) {
        setCurrentTranscriptId(data.transcript_id);
        
        toast({
          title: "Transcription Complete",
          description: `Used ${data.minutes_used} minute${data.minutes_used === 1 ? '' : 's'} of transcription in ${selectedLanguage.name}.`,
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
  
  const handleExport = async (tool: string) => {
    if (!currentTranscript.length) {
      toast({
        title: "No Transcript Available",
        description: "Please create a transcript before exporting.",
        variant: "destructive"
      });
      return;
    }
    
    setExporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('meeting-export', {
        body: { 
          transcriptId: currentTranscript[0]?.transcript_id,
          exportType: tool,
          addSummary: true
        }
      });
      
      if (error) {
        throw new Error(`Export error: ${error.message}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      toast({
        title: "Export Successful",
        description: data.message,
      });
      
      // Open the exported document if a URL is provided
      if (data.exportUrl) {
        window.open(data.exportUrl, '_blank');
      }
    } catch (error) {
      console.error('Error exporting transcript:', error);
      toast({
        title: "Export Failed",
        description: error.message || "An unexpected error occurred while exporting.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };
  
  const toggleVoiceCommands = () => {
    setIsListeningForVoiceCommands(!isListeningForVoiceCommands);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Transcription</CardTitle>
            <CardDescription>
              {isTranscribing 
                ? `Transcribing your meeting in ${selectedLanguage.name}` 
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <Globe size={16} className="mr-2" />
                  {selectedLanguage.name}
                  <ChevronDown size={16} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {LANGUAGES.map((language) => (
                  <DropdownMenuItem 
                    key={language.code} 
                    onClick={() => setSelectedLanguage(language)}
                  >
                    {language.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
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
              <span className="text-sm font-medium">Recording in {selectedLanguage.name}...</span>
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
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleVoiceCommands}
                  className={isListeningForVoiceCommands ? "border-green-500 text-green-500" : ""}
                >
                  {isListeningForVoiceCommands ? "Voice Commands On" : "Enable Voice Commands"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleVoiceCommands}
            className={isListeningForVoiceCommands ? "border-green-500 text-green-500" : ""}
          >
            {isListeningForVoiceCommands ? "Voice Commands On" : "Voice Commands"}
          </Button>
        </div>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={currentTranscript.length === 0 || isProcessing || exporting}
              >
                <Share2 size={16} className="mr-2" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid gap-2">
                <h4 className="font-medium text-sm">Export to</h4>
                {EXPORT_TOOLS.map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(tool.id)}
                    disabled={exporting}
                    className="justify-start"
                  >
                    {tool.name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
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
        </div>
      </CardFooter>
    </Card>
  );
}
