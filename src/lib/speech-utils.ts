
import { SpeechRecognitionResult } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Define a single global declaration block with all needed types
declare global {
  // SpeechRecognition API interfaces
  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    readonly length: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;  // Add the missing onend property
  }

  // SpeechRecognition constructor
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  // Webkit prefix for Safari
  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
}

// Speech recognition singleton
class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private language: string = 'en-US';
  
  constructor() {
    // Check browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionImpl) {
        this.recognition = new SpeechRecognitionImpl();
        this.configureRecognition();
      }
    }
  }
  
  private configureRecognition(): void {
    if (!this.recognition) return;
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (this.onResultCallback) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          this.onResultCallback({
            transcript: result[0].transcript,
            confidence: result[0].confidence,
            isFinal: result.isFinal,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };
    
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
      console.error('Speech recognition error:', event.error);
    };
    
    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if we're supposed to be listening
        this.recognition?.start();
      }
    };
  }
  
  public setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
  
  public start(onResult: (result: SpeechRecognitionResult) => void, onError?: (error: string) => void): void {
    if (!this.recognition) {
      if (onError) onError("Speech recognition not supported in this browser");
      return;
    }
    
    this.onResultCallback = onResult;
    if (onError) this.onErrorCallback = onError;
    
    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        if (onError) onError("Failed to start speech recognition");
      }
    }
  }
  
  public stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  public isSupported(): boolean {
    return !!this.recognition;
  }
}

export const speechRecognition = new SpeechRecognitionService();

// Process speech results and save to database
export async function processSpeechResult(
  result: SpeechRecognitionResult, 
  transcriptId: string, 
  userId: string
): Promise<void> {
  if (!result.isFinal) return;
  
  // Add speaker detection (simplified version)
  // In a real app, this would use a more sophisticated speaker diarization algorithm
  const speaker = result.speaker || "Speaker";
  
  // Save to database
  const { error } = await supabase
    .from('transcript_segments')
    .insert({
      transcript_id: transcriptId,
      speaker,
      text: result.transcript,
      timestamp: result.timestamp
    });
    
  if (error) {
    console.error('Error saving transcript segment:', error);
  }
}

// Process audio data for server-side transcription
export async function processAudioData(
  audioBlob: Blob, 
  transcriptId: string, 
  language: string = 'en-US'
): Promise<boolean> {
  try {
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // Call server-side transcription function
    const { data, error } = await supabase.functions.invoke('google-transcribe', {
      body: { 
        audioData: base64Audio,
        transcriptId,
        languageCode: language
      }
    });
    
    if (error) {
      console.error('Error processing audio:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error processing audio data:', error);
    return false;
  }
}

// Helper to convert Blob to base64
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
