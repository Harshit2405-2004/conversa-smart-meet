
// Basic speech recognition types
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
  timestamp?: string;
}

// Define global speech recognition types
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
    onend: () => void; // Explicitly define onend property
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
