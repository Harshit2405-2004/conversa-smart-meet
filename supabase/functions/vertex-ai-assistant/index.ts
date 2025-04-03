
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MeetingContext = {
  transcript_id: string;
  segments: {
    speaker: string;
    text: string;
    timestamp: string;
  }[];
  meeting: {
    title: string;
    date: string;
    duration: number;
  };
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

    // Get the request body
    const { query, transcriptId } = await req.json();

    if (!query || !transcriptId) {
      return new Response(
        JSON.stringify({ error: 'Missing query or transcriptId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's remaining AI queries
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('remaining_ai_queries')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.remaining_ai_queries <= 0) {
      return new Response(
        JSON.stringify({ error: 'No AI queries remaining. Please upgrade your plan.' }),
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

    // Get the transcript segments
    const { data: segments, error: segmentsError } = await supabaseClient
      .from('transcript_segments')
      .select('speaker, text, timestamp')
      .eq('transcript_id', transcriptId)
      .order('timestamp', { ascending: true });

    if (segmentsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transcript segments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the transcript title for context
    const { data: transcript, error: transcriptError } = await supabaseClient
      .from('transcripts')
      .select('title, date, duration')
      .eq('id', transcriptId)
      .single();
    
    if (transcriptError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transcript' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the context for AI processing
    const meetingContext: MeetingContext = {
      transcript_id: transcriptId,
      segments,
      meeting: {
        title: transcript.title,
        date: transcript.date,
        duration: transcript.duration
      }
    };

    // Construct a transcript text for processing
    const transcriptText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');
    
    // Call Google's Vertex AI API
    // Using generateText API with PaLM 2 text model
    const vertexAIResponse = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/text-bison:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{
            content: `
              You are an AI assistant that helps users analyze meeting transcripts.
              
              TRANSCRIPT:
              ${transcriptText}
              
              MEETING INFO:
              Title: ${transcript.title}
              Date: ${transcript.date}
              Duration: ${transcript.duration} minutes
              
              USER QUERY:
              ${query}
              
              Provide a helpful and informative response addressing the user's query based on the transcript content.
            `
          }],
          parameters: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            topK: 40,
            topP: 0.95
          }
        })
      }
    );

    if (!vertexAIResponse.ok) {
      const errorData = await vertexAIResponse.json();
      console.error('Vertex AI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to process query with Vertex AI' }),
        { status: vertexAIResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await vertexAIResponse.json();
    const aiResponse = aiData.predictions[0].content;

    // Optional: If query is about summarizing, also use Natural Language API
    let enhancedResponse = aiResponse;
    if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
      try {
        const nlpResponse = await fetch(
          `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document: {
                type: 'PLAIN_TEXT',
                content: transcriptText
              }
            })
          }
        );
        
        if (nlpResponse.ok) {
          const nlpData = await nlpResponse.json();
          const sentimentScore = nlpData.documentSentiment.score;
          const sentimentMagnitude = nlpData.documentSentiment.magnitude;
          
          const sentiment = sentimentScore > 0.25 ? "positive" :
                          sentimentScore < -0.25 ? "negative" : "neutral";
                          
          enhancedResponse += `\n\nOverall meeting sentiment: ${sentiment} (confidence: ${(Math.abs(sentimentScore) * 100).toFixed(1)}%, intensity: ${(sentimentMagnitude * 100).toFixed(1)}%)`;
        }
      } catch (nlpError) {
        console.error('Natural Language API error:', nlpError);
        // Continue with the original response if NLP fails
      }
    }

    // Decrement the user's remaining AI queries
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ remaining_ai_queries: profile.remaining_ai_queries - 1 })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Failed to update remaining AI queries:', updateError);
    }

    // Store the AI message in the database
    const { data: message, error: messageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        user_id: user.id,
        transcript_id: transcriptId,
        text: enhancedResponse,
        sender: 'ai'
      })
      .select()
      .single();
    
    if (messageError) {
      return new Response(
        JSON.stringify({ error: 'Failed to store AI message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vertex-ai-assistant function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
