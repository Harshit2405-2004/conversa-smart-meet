import { SpeechRecognitionResult } from "@/types";

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private language: string = 'en-US';
  
  constructor() {
    // Check browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognitionImpl = (window.SpeechRecognition || window.webkitSpeechRecognition) as {
        new(): SpeechRecognition;
      };
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
    
    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart recognition if it was stopped unexpectedly
        this.recognition?.start();
      }
    };
    
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
