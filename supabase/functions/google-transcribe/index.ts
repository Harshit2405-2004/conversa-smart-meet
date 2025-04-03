
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get the user profile to check remaining transcription minutes
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('remaining_transcription')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
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

    // Get the audio data from the request
    const { audioData, recordingDuration } = await req.json();
    
    if (!audioData) {
      return new Response(
        JSON.stringify({ error: 'Missing audio data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Access the Google Cloud API key from environment variables
    const apiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Cloud API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the request to Google Speech-to-Text API with diarization
    const response = await fetch(`https://speech.googleapis.com/v1p1beta1/speech:recognize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: 2, // Estimate the number of speakers
          model: 'latest_long',
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: audioData, // Base64-encoded audio data
        },
      }),
    });

    const transcriptionResult = await response.json();

    if (!response.ok) {
      console.error('Google Speech-to-Text API error:', transcriptionResult);
      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio', details: transcriptionResult }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the diarization results to create transcript segments
    const segments = processTranscriptionWithSpeakers(transcriptionResult);
    
    // Create a new transcript in the database
    const { data: transcript, error: transcriptError } = await supabaseClient
      .from('transcripts')
      .insert({
        title: `Meeting on ${new Date().toLocaleString()}`,
        duration: recordingDuration || Math.round(segments.reduce((total, s) => total + (s.durationSeconds || 0), 0)),
        user_id: user.id
      })
      .select()
      .single();
    
    if (transcriptError || !transcript) {
      console.error('Error creating transcript:', transcriptError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transcript record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the transcript segments
    const segmentsToInsert = segments.map(segment => ({
      transcript_id: transcript.id,
      speaker: segment.speaker,
      text: segment.text,
      timestamp: segment.timestamp
    }));

    const { error: segmentsError } = await supabaseClient
      .from('transcript_segments')
      .insert(segmentsToInsert);
      
    if (segmentsError) {
      console.error('Error creating transcript segments:', segmentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transcript segments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrement the remaining transcription minutes
    // Convert seconds to minutes and round up
    const minutesUsed = Math.ceil(recordingDuration / 60);
    
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        remaining_transcription: Math.max(0, profile.remaining_transcription - minutesUsed) 
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Error updating remaining transcription minutes:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        transcript_id: transcript.id,
        segments: segmentsToInsert,
        minutes_used: minutesUsed,
        remaining_minutes: Math.max(0, profile.remaining_transcription - minutesUsed)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-transcribe function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Process the transcription result to extract speaker information
function processTranscriptionWithSpeakers(transcriptionResult) {
  if (!transcriptionResult.results || transcriptionResult.results.length === 0) {
    return [];
  }

  const segments = [];
  let currentTimestamp = 0;

  transcriptionResult.results.forEach(result => {
    if (!result.alternatives || result.alternatives.length === 0) return;
    
    const alternative = result.alternatives[0];
    const words = alternative.words || [];
    
    let currentSpeaker = null;
    let currentText = '';
    let startTime = 0;
    let speakerStartTime = 0;

    words.forEach(word => {
      const speaker = `Speaker ${word.speakerTag || 1}`; // Default to Speaker 1 if no tag
      const wordStartTime = parseFloat(word.startTime?.seconds || 0) + 
                           (parseFloat(word.startTime?.nanos || 0) / 1_000_000_000);
      
      if (currentSpeaker === null) {
        currentSpeaker = speaker;
        currentText = word.word;
        speakerStartTime = wordStartTime;
      } else if (speaker !== currentSpeaker) {
        // Speaker changed, create a new segment
        const timestamp = formatTimestamp(speakerStartTime);
        segments.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          timestamp,
          durationSeconds: wordStartTime - speakerStartTime,
        });
        
        currentSpeaker = speaker;
        currentText = word.word;
        speakerStartTime = wordStartTime;
      } else {
        // Same speaker, append to the current text
        currentText += ' ' + word.word;
      }

      startTime = wordStartTime;
    });

    // Add the last segment
    if (currentSpeaker !== null) {
      const timestamp = formatTimestamp(speakerStartTime);
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        timestamp,
        durationSeconds: startTime - speakerStartTime,
      });
    }

    currentTimestamp = Math.max(currentTimestamp, startTime);
  });

  return segments;
}

function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
