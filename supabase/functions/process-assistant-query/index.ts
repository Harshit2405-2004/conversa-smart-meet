
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
    };

    // In a real implementation, we would send this to an AI service like OpenAI
    // For now, we'll create more sophisticated mock responses based on the query and transcript context
    
    // Build a transcript summary from the segments for context
    const transcriptText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');
    const meeting = {
      title: transcript.title,
      date: transcript.date,
      duration: transcript.duration,
      participants: [...new Set(segments.map(s => s.speaker))]
    };
    
    // Generate more intelligent mock responses based on query content and transcript
    let aiResponse = '';
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('summary') || lowerQuery.includes('summarize')) {
      aiResponse = `Here's a summary of "${meeting.title}":\n\nThe meeting lasted ${meeting.duration} minutes and included ${meeting.participants.length} participants (${meeting.participants.join(', ')}).\n\nKey points discussed:\n- Project timeline was reviewed and is on track for delivery\n- Resource allocation for the next quarter was discussed\n- Team agreed on next steps for implementation\n- Follow-up meeting scheduled for next week`;
    } 
    else if (lowerQuery.includes('action') || lowerQuery.includes('task')) {
      aiResponse = `I identified these action items from "${meeting.title}":\n\n1. ${meeting.participants[0]} to review project timeline by Friday\n2. ${meeting.participants.length > 1 ? meeting.participants[1] : meeting.participants[0]} to prepare resource allocation report for Q3\n3. Schedule follow-up meeting for next week\n4. Share meeting notes with the broader team`;
    } 
    else if (lowerQuery.includes('email') || lowerQuery.includes('draft')) {
      aiResponse = `Here's a draft email for "${meeting.title}":\n\nSubject: Meeting Summary - ${meeting.title}\n\nHi team,\n\nThank you for joining our meeting on ${new Date(meeting.date).toLocaleDateString()}. We had a productive discussion about our current project status.\n\nKey points:\n- Current project is on track for delivery\n- We need to allocate additional resources for Q3\n- Follow-up meeting scheduled for next week\n\nAction items:\n${meeting.participants.map((p, i) => `- ${p}: ${['Review timeline', 'Prepare resource report', 'Schedule follow-up', 'Distribute notes'][i % 4]}`).join('\n')}\n\nPlease let me know if you have any questions.\n\nBest regards,\n[Your Name]`;
    }
    else if (lowerQuery.includes('participant') || lowerQuery.includes('attend') || lowerQuery.includes('who')) {
      aiResponse = `The meeting "${meeting.title}" had ${meeting.participants.length} participants:\n\n${meeting.participants.map((p, i) => `${i+1}. ${p}`).join('\n')}\n\nThe meeting took place on ${new Date(meeting.date).toLocaleDateString()} and lasted approximately ${meeting.duration} minutes.`;
    }
    else if (lowerQuery.includes('duration') || lowerQuery.includes('how long')) {
      aiResponse = `The meeting "${meeting.title}" lasted approximately ${meeting.duration} minutes. It took place on ${new Date(meeting.date).toLocaleDateString()}.`;
    }
    else {
      aiResponse = `Based on the transcript of "${meeting.title}", the discussion focused on project progress and next steps. The meeting involved ${meeting.participants.length} participants and covered topics including timeline planning, resource allocation, and action items.\n\nIs there something specific about the meeting you'd like to know more about?`;
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
    console.error('Error in process-assistant-query:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
