
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

type MeetingContext = {
  transcript_id: string;
  segments: {
    speaker: string;
    text: string;
    timestamp: string;
  }[];
};

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
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

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

    // Prepare the context for AI processing
    const meetingContext: MeetingContext = {
      transcript_id: transcriptId,
      segments,
    };

    // In a real implementation, we would send this to an AI service like OpenAI
    // For now, we'll mock the response based on the query
    
    // Mock responses based on query content
    let aiResponse = '';
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('summary') || lowerQuery.includes('summarize')) {
      aiResponse = "Here's a summary of the meeting: The team discussed project timelines, resource allocation, and next steps. There was agreement to reconvene next week to finalize decisions.";
    } else if (lowerQuery.includes('action') || lowerQuery.includes('task')) {
      aiResponse = "I identified these action items from the transcript:\n1. Review project timeline\n2. Allocate resources for Q3\n3. Schedule follow-up meeting for next week";
    } else if (lowerQuery.includes('email') || lowerQuery.includes('draft')) {
      aiResponse = "Here's a draft email:\n\nSubject: Meeting Summary - Project Updates\n\nHi team,\n\nThank you for joining today's meeting. We discussed the project timeline and resource allocation, and agreed on next steps.\n\nKey points:\n- Current project is on track for Q2 delivery\n- We need to allocate additional resources for Q3\n- Follow-up meeting scheduled for next week\n\nPlease let me know if you have any questions.\n\nBest regards,";
    } else {
      aiResponse = "Based on the meeting transcript, the team discussed project progress and next steps. The main points were about timelines, resource allocation, and action items for next week.";
    }

    // Store the AI message in the database
    const { data: message, error: messageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        user_id: user.id,
        transcript_id: transcriptId,
        text: aiResponse,
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
