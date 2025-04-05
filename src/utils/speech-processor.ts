
import { SpeechRecognitionResult } from "@/types";
import { supabase } from "@/integrations/supabase/client";

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
