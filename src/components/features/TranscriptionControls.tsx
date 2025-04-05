
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Settings, Save } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

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

export function TranscriptionControls() {
  const { toast } = useToast();
  const { isTranscribing, startTranscription, stopTranscription, user } = useStore();
  
  const [language, setLanguage] = useState('en-US');
  const [enableSpeakerDiarization, setEnableSpeakerDiarization] = useState(true);
  const [enablePunctuation, setEnablePunctuation] = useState(true);
  const [saveSettings, setSaveSettings] = useState(false);
  
  const handleStartTranscription = () => {
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
    
    // Save settings to localStorage if enabled
    if (saveSettings) {
      localStorage.setItem('transcription_settings', JSON.stringify({
        language,
        enableSpeakerDiarization,
        enablePunctuation
      }));
    }
    
    startTranscription();
    
    toast({
      title: "Transcription Started",
      description: `Transcribing in ${LANGUAGES.find(l => l.code === language)?.name || language}`,
    });
  };
  
  const handleStopTranscription = () => {
    stopTranscription();
    
    toast({
      title: "Transcription Stopped",
      description: "Your transcription has been saved.",
    });
  };
  
  // Load settings from localStorage on component mount
  useState(() => {
    try {
      const savedSettings = localStorage.getItem('transcription_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setLanguage(settings.language || 'en-US');
        setEnableSpeakerDiarization(settings.enableSpeakerDiarization !== false);
        setEnablePunctuation(settings.enablePunctuation !== false);
        setSaveSettings(true);
      }
    } catch (error) {
      console.error('Error loading saved transcription settings:', error);
    }
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transcription Controls</span>
          <Settings className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={language}
            onValueChange={setLanguage}
            disabled={isTranscribing}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="speaker-diarization" className="cursor-pointer">
            Speaker Identification
          </Label>
          <Switch
            id="speaker-diarization"
            checked={enableSpeakerDiarization}
            onCheckedChange={setEnableSpeakerDiarization}
            disabled={isTranscribing}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="punctuation" className="cursor-pointer">
            Auto-Punctuation
          </Label>
          <Switch
            id="punctuation"
            checked={enablePunctuation}
            onCheckedChange={setEnablePunctuation}
            disabled={isTranscribing}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="save-settings" className="cursor-pointer">
            Save Settings
          </Label>
          <Switch
            id="save-settings"
            checked={saveSettings}
            onCheckedChange={setSaveSettings}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={isTranscribing ? handleStopTranscription : handleStartTranscription}
          variant={isTranscribing ? "destructive" : "default"}
          className="w-full"
        >
          {isTranscribing ? (
            <>
              <MicOff className="mr-2 h-4 w-4" />
              Stop Transcription
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              Start Transcription
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
