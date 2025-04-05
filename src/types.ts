export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium';
  remainingTranscription: number; // minutes
  remainingAIQueries: number;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
  transcript_id: string;
}

export interface Transcript {
  id: string;
  title: string;
  date: string;
  duration: number; // minutes
  content: TranscriptSegment[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date | string;
  transcript_id?: string;
  user_id?: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'premium';
  remaining_transcription: number;
  remaining_ai_queries: number;
}

// Update the SpeechRecognitionResult type if it already exists, or add it if it doesn't
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
  timestamp?: string;
}
