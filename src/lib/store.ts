
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { User, TranscriptSegment, Transcript, ChatMessage, Profile } from '@/types';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  
  // Transcription state
  isTranscribing: boolean;
  currentTranscript: TranscriptSegment[];
  savedTranscripts: Transcript[];
  fetchTranscripts: () => Promise<void>;
  startTranscription: () => void;
  stopTranscription: () => Promise<void>;
  
  // Chat state
  chatMessages: ChatMessage[];
  currentTranscriptId: string | null;
  setCurrentTranscriptId: (id: string | null) => void;
  fetchChatMessages: (transcriptId: string) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // User state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    isLoading: false
  }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ 
      isAuthenticated: false, 
      user: null,
      currentTranscriptId: null,
      chatMessages: []
    });
  },
  
  // Transcription state
  isTranscribing: false,
  currentTranscript: [],
  savedTranscripts: [],
  fetchTranscripts: async () => {
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select(`
        id, 
        title, 
        date, 
        duration,
        transcript_segments (
          speaker, 
          text, 
          timestamp
        )
      `)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching transcripts:', error);
      return;
    }

    if (!transcripts) {
      console.error('No transcripts found');
      return;
    }

    const formattedTranscripts = transcripts.map(transcript => ({
      id: transcript.id,
      title: transcript.title,
      date: transcript.date,
      duration: transcript.duration,
      content: transcript.transcript_segments
    }));
    
    set({ savedTranscripts: formattedTranscripts });
  },
  startTranscription: () => {
    set({ isTranscribing: true });
    // In a real implementation this would connect to the Google Meet API
  },
  stopTranscription: async () => {
    const { currentTranscript } = get();
    
    // Create a new transcript in the database
    const { data: transcript, error } = await supabase
      .from('transcripts')
      .insert({
        title: `Meeting on ${new Date().toLocaleString()}`,
        duration: 15 // Mock duration
      })
      .select()
      .single();
    
    if (error || !transcript) {
      console.error('Error creating transcript:', error);
      return;
    }

    // Create transcript segments
    const mockSegments = [
      { speaker: 'John Doe', text: 'Hello everyone, thanks for joining today.', timestamp: '00:00' },
      { speaker: 'Jane Smith', text: 'Good to be here. I have some updates on the project.', timestamp: '00:05' },
      { speaker: 'Alex Johnson', text: 'I have a question about the timeline.', timestamp: '00:15' },
      { speaker: 'John Doe', text: 'Sure, let me explain our current roadmap.', timestamp: '00:20' }
    ];
    
    const segmentsToInsert = mockSegments.map(segment => ({
      transcript_id: transcript.id,
      speaker: segment.speaker,
      text: segment.text,
      timestamp: segment.timestamp
    }));

    const { error: segmentsError } = await supabase
      .from('transcript_segments')
      .insert(segmentsToInsert);
    
    if (segmentsError) {
      console.error('Error creating transcript segments:', segmentsError);
    }

    // Update local state
    set({ 
      isTranscribing: false,
      currentTranscript: mockSegments,
      currentTranscriptId: transcript.id
    });

    // Refresh the transcripts list
    get().fetchTranscripts();
  },
  
  // Chat state
  chatMessages: [],
  currentTranscriptId: null,
  setCurrentTranscriptId: (id) => set({ currentTranscriptId: id }),
  fetchChatMessages: async (transcriptId) => {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('transcript_id', transcriptId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error fetching chat messages:', error);
      return;
    }

    // Convert the generic sender string to our specific "user" | "ai" type
    const typedMessages = messages ? messages.map(message => ({
      ...message,
      sender: message.sender === 'user' ? 'user' : 'ai' 
    } as ChatMessage)) : [];

    set({ 
      chatMessages: typedMessages,
      currentTranscriptId: transcriptId
    });
  },
  sendChatMessage: async (message) => {
    const { user, currentTranscriptId, chatMessages } = get();
    
    if (!user || !currentTranscriptId) {
      console.error('User not authenticated or no transcript selected');
      return;
    }

    // Add user message to database
    const { data: userMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        transcript_id: currentTranscriptId,
        text: message,
        sender: 'user'
      })
      .select()
      .single();
    
    if (userMessageError || !userMessage) {
      console.error('Error sending user message:', userMessageError);
      return;
    }

    // Update local state
    set({ chatMessages: [...chatMessages, {
      ...userMessage,
      sender: 'user' as const
    }] });

    // In a real implementation, this would call an AI service
    // For now, mock an AI response after a delay
    setTimeout(async () => {
      const responses = [
        "I've analyzed the transcript and found 3 key action items that were mentioned.",
        "Based on the discussion, the main points were about project timelines and resource allocation.",
        "The meeting participants agreed to reconvene next week to finalize the decision.",
        "I can help you draft a follow-up email with the meeting highlights if you'd like."
      ];
      
      // Add AI message to database
      const { data: aiMessage, error: aiMessageError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          transcript_id: currentTranscriptId,
          text: responses[Math.floor(Math.random() * responses.length)],
          sender: 'ai'
        })
        .select()
        .single();

      if (aiMessageError || !aiMessage) {
        console.error('Error sending AI message:', aiMessageError);
        return;
      }

      // Update local state with AI message
      set(state => ({
        chatMessages: [...state.chatMessages, {
          ...aiMessage,
          sender: 'ai' as const
        }]
      }));
    }, 1500);
  }
}));
