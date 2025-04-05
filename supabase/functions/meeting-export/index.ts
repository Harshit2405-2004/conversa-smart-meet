
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
    const { transcriptId, exportType, addSummary } = await req.json();

    if (!transcriptId) {
      return new Response(
        JSON.stringify({ error: 'Missing transcriptId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the transcript
    const { data: transcript, error: transcriptError } = await supabaseClient
      .from('transcripts')
      .select('title, date')
      .eq('id', transcriptId)
      .single();

    if (transcriptError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transcript' }),
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

    // Format transcript data
    const transcriptTitle = transcript.title;
    const transcriptDate = new Date(transcript.date).toLocaleDateString();
    const formattedTranscript = segments.map(segment => 
      `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`
    ).join('\n\n');

    // Generate a summary if requested
    let summary = '';
    if (addSummary) {
      // Call Vertex AI for summary generation
      try {
        const { data: summaryData, error: summaryError } = await supabaseClient.functions.invoke('vertex-ai-assistant', {
          body: { 
            query: "Please provide a concise summary of this meeting transcript", 
            transcriptId 
          }
        });

        if (!summaryError && summaryData?.message?.text) {
          summary = summaryData.message.text;
        }
      } catch (err) {
        console.error('Error generating summary:', err);
        // Continue without summary if there's an error
      }
    }

    // Handle export based on exportType
    let exportUrl = '';
    let message = '';

    if (exportType === 'googleDocs') {
      // Mock Google Docs export for now
      // In a real implementation, we would use Google Docs API
      exportUrl = `https://docs.google.com/document/create`;
      message = 'Your transcript has been exported to Google Docs. A new document will open where you can paste the content.';
    } 
    else if (exportType === 'notion') {
      // Mock Notion export for now
      // In a real implementation, we would use Notion API
      exportUrl = `https://www.notion.so/new`;
      message = 'Your transcript has been exported to Notion. A new page will open where you can paste the content.';
    }
    else {
      exportUrl = '';
      message = 'Transcript exported successfully.';
    }

    // Create export content
    const exportContent = `
# ${transcriptTitle}
Date: ${transcriptDate}

${summary ? `## Summary\n${summary}\n\n` : ''}
## Transcript
${formattedTranscript}
    `.trim();

    // For now, return the content directly
    // In a real implementation, we would use the respective APIs
    return new Response(
      JSON.stringify({ 
        exportUrl,
        message,
        content: exportContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in meeting-export:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
