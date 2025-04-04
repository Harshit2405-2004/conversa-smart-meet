
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define supported languages
const SUPPORTED_LANGUAGES = [
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the request
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the request body
    const { audioData, languageCode = 'en-US', meetingId } = await req.json();

    if (!audioData) {
      return new Response(
        JSON.stringify({ error: 'Missing audio data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate language code
    if (!SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported language code', supportedLanguages: SUPPORTED_LANGUAGES }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's remaining transcription minutes
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('remaining_transcription, plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.remaining_transcription <= 0) {
      return new Response(
        JSON.stringify({ error: 'No transcription minutes remaining. Please upgrade your plan.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Access the Google Cloud API key
    const apiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Cloud API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Speech-to-Text API with language specification
    const speechResponse = await fetch(
      `https://speech.googleapis.com/v1p1beta1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: languageCode,
            enableAutomaticPunctuation: true,
            enableSpeakerDiarization: true,
            diarizationSpeakerCount: 10,
            model: 'latest_long',
            useEnhanced: true,
          },
          audio: {
            content: audioData
          }
        })
      }
    );

    if (!speechResponse.ok) {
      const errorData = await speechResponse.json();
      console.error('Google Speech-to-Text API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio' }),
        { status: speechResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const speechData = await speechResponse.json();
    
    // Process transcript segments with speaker diarization
    const transcriptSegments = processTranscriptWithSpeakers(speechData);
    
    // Calculate minutes used (based on audio length)
    const audioLength = calculateAudioLength(audioData);
    const minutesUsed = Math.ceil(audioLength / 60);
    
    // Update the user's remaining transcription minutes
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        remaining_transcription: profile.remaining_transcription - minutesUsed 
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Failed to update remaining transcription minutes:', updateError);
    }
    
    // Store the transcript in the database
    let transcriptId;
    let title = `Meeting ${new Date().toLocaleDateString()}`;
    
    // Create or update transcript record
    if (meetingId) {
      // Check if a transcript already exists for this meeting
      const { data: existingTranscript } = await supabaseClient
        .from('transcripts')
        .select('id, title')
        .eq('id', meetingId)
        .single();
        
      if (existingTranscript) {
        transcriptId = existingTranscript.id;
        title = existingTranscript.title;
      } else {
        // Create new transcript record
        const { data: newTranscript, error: transcriptError } = await supabaseClient
          .from('transcripts')
          .insert({
            title,
            user_id: user.id,
            duration: Math.ceil(audioLength)
          })
          .select()
          .single();
          
        if (transcriptError) {
          console.error('Failed to create transcript record:', transcriptError);
          return new Response(
            JSON.stringify({ error: 'Failed to store transcript' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        transcriptId = newTranscript.id;
      }
    } else {
      // Create new transcript record
      const { data: newTranscript, error: transcriptError } = await supabaseClient
        .from('transcripts')
        .insert({
          title,
          user_id: user.id,
          duration: Math.ceil(audioLength)
        })
        .select()
        .single();
        
      if (transcriptError) {
        console.error('Failed to create transcript record:', transcriptError);
        return new Response(
          JSON.stringify({ error: 'Failed to store transcript' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      transcriptId = newTranscript.id;
    }
    
    // Store transcript segments
    const { error: segmentsError } = await supabaseClient
      .from('transcript_segments')
      .insert(
        transcriptSegments.map(segment => ({
          transcript_id: transcriptId,
          speaker: segment.speaker,
          text: segment.text,
          timestamp: segment.timestamp
        }))
      );
      
    if (segmentsError) {
      console.error('Failed to store transcript segments:', segmentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to store transcript segments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        transcript: transcriptSegments,
        transcript_id: transcriptId,
        minutes_used: minutesUsed,
        remaining_minutes: profile.remaining_transcription - minutesUsed,
        language: languageCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in multi-language-transcribe function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to process transcript with speaker diarization
function processTranscriptWithSpeakers(speechData) {
  if (!speechData.results || speechData.results.length === 0) {
    return [];
  }
  
  const segments = [];
  let currentTime = 0;
  
  speechData.results.forEach(result => {
    if (!result.alternatives || result.alternatives.length === 0) {
      return;
    }
    
    const alternative = result.alternatives[0];
    
    if (alternative.words && alternative.words.length > 0) {
      let currentSpeaker = null;
      let currentText = '';
      let startTime = null;
      
      alternative.words.forEach(word => {
        // If speaker changes or this is the first word
        if (currentSpeaker === null || currentSpeaker !== `Speaker ${word.speakerTag}`) {
          // Save previous segment if it exists
          if (currentSpeaker !== null && currentText.trim() !== '') {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
              timestamp: formatTimestamp(startTime)
            });
          }
          
          // Start new segment
          currentSpeaker = `Speaker ${word.speakerTag}`;
          currentText = word.word + ' ';
          startTime = parseFloat(word.startTime.replace('s', ''));
        } else {
          // Continue current segment
          currentText += word.word + ' ';
        }
      });
      
      // Add the last segment
      if (currentSpeaker !== null && currentText.trim() !== '') {
        segments.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          timestamp: formatTimestamp(startTime)
        });
      }
    } else if (alternative.transcript) {
      // Fallback if no word-level details
      const timestamp = formatTimestamp(currentTime);
      segments.push({
        speaker: 'Speaker',
        text: alternative.transcript.trim(),
        timestamp
      });
      
      // Estimate time based on words (average speaking rate)
      const wordCount = alternative.transcript.split(' ').length;
      currentTime += wordCount * 0.4; // Rough estimate: 0.4 seconds per word
    }
  });
  
  return segments;
}

// Helper function to format timestamps
function formatTimestamp(seconds) {
  if (seconds === null || isNaN(seconds)) {
    return '00:00';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to calculate audio length from base64 data
function calculateAudioLength(base64Audio) {
  // This is a rough estimation based on base64 data size
  // For more accuracy, we would need to analyze the actual audio file
  // Average WebM Opus bitrate: ~32kbps
  const sizeInBytes = (base64Audio.length * 3) / 4;
  const bitrate = 32 * 1024 / 8; // 32kbps in bytes per second
  const estimatedSeconds = sizeInBytes / bitrate;
  
  return estimatedSeconds;
}
