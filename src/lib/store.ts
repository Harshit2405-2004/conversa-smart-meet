
import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium';
  remainingTranscription: number; // minutes
  remainingAIQueries: number;
}

export interface Transcript {
  id: string;
  title: string;
  date: string;
  duration: number; // minutes
  content: TranscriptSegment[];
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AppState {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  
  // Transcription state
  isTranscribing: boolean;
  currentTranscript: TranscriptSegment[];
  savedTranscripts: Transcript[];
  startTranscription: () => void;
  stopTranscription: () => void;
  
  // Chat state
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string) => void;
}

// Mock implementation for prototype
export const useStore = create<AppState>((set) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  login: async (email: string, password: string) => {
    // Mock authentication
    await new Promise(resolve => setTimeout(resolve, 1000));
    set({
      isAuthenticated: true,
      user: {
        id: '123',
        email,
        name: email.split('@')[0],
        plan: 'free',
        remainingTranscription: 30, // 30 minutes for free plan
        remainingAIQueries: 30,
      }
    });
  },
  logout: () => {
    set({ isAuthenticated: false, user: null });
  },
  
  // Transcription state
  isTranscribing: false,
  currentTranscript: [],
  savedTranscripts: [],
  startTranscription: () => {
    set({ isTranscribing: true });
    // In the real implementation, this would connect to the Google Meet API
  },
  stopTranscription: () => {
    set((state) => {
      // Mock saved transcript
      const transcript: Transcript = {
        id: Date.now().toString(),
        title: `Meeting on ${new Date().toLocaleString()}`,
        date: new Date().toISOString(),
        duration: 15,
        content: [
          { speaker: 'John Doe', text: 'Hello everyone, thanks for joining today.', timestamp: '00:00' },
          { speaker: 'Jane Smith', text: 'Good to be here. I have some updates on the project.', timestamp: '00:05' },
          { speaker: 'Alex Johnson', text: 'I have a question about the timeline.', timestamp: '00:15' },
          { speaker: 'John Doe', text: 'Sure, let me explain our current roadmap.', timestamp: '00:20' },
        ]
      };
      
      return {
        isTranscribing: false,
        savedTranscripts: [...state.savedTranscripts, transcript]
      };
    });
  },
  
  // Chat state
  chatMessages: [],
  sendChatMessage: (message: string) => {
    set((state) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date()
      };
      
      // Mock AI response (would be replaced with actual API call)
      setTimeout(() => {
        set((state) => {
          const responses = [
            "I've analyzed the transcript and found 3 key action items that were mentioned.",
            "Based on the discussion, the main points were about project timelines and resource allocation.",
            "The meeting participants agreed to reconvene next week to finalize the decision.",
            "I can help you draft a follow-up email with the meeting highlights if you'd like."
          ];
          
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: responses[Math.floor(Math.random() * responses.length)],
            sender: 'ai',
            timestamp: new Date()
          };
          
          return {
            chatMessages: [...state.chatMessages, aiMessage]
          };
        });
      }, 1500);
      
      return {
        chatMessages: [...state.chatMessages, userMessage]
      };
    });
  }
}));
