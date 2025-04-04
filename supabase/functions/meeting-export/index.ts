
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

    // Get the request parameters
    const { transcriptId, exportType, addSummary } = await req.json();
    
    if (!transcriptId) {
      return new Response(
        JSON.stringify({ error: 'Missing transcript ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['googleDocs', 'notion'].includes(exportType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid export type. Must be "googleDocs" or "notion"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the transcript data
    const { data: transcript, error: transcriptError } = await supabaseClient
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
      .eq('id', transcriptId)
      .single();
    
    if (transcriptError || !transcript) {
      console.error('Error fetching transcript:', transcriptError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transcript data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the transcript belongs to the user
    if (transcript.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to export this transcript' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a summary if requested
    let summary = '';
    if (addSummary) {
      summary = await generateSummary(transcript);
    }

    // Export based on the requested type
    let exportResult;
    if (exportType === 'googleDocs') {
      exportResult = await exportToGoogleDocs(transcript, summary, user.id);
    } else {
      exportResult = await exportToNotion(transcript, summary, user.id);
    }

    return new Response(
      JSON.stringify(exportResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in meeting-export function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate a summary of the transcript using AI
async function generateSummary(transcript) {
  try {
    // Concatenate the transcript text
    const transcriptText = transcript.transcript_segments
      .map(segment => `${segment.speaker}: ${segment.text}`)
      .join('\n');
    
    // Use an AI service to generate a summary
    // This is a placeholder - in production, you would call an AI service like OpenAI
    return `This is a summary of the meeting "${transcript.title}" that took place on ${new Date(transcript.date).toLocaleDateString()}. The meeting lasted approximately ${transcript.duration} minutes.`;
  } catch (error) {
    console.error('Error generating summary:', error);
    return '';
  }
}

// Export the transcript to Google Docs
async function exportToGoogleDocs(transcript, summary, userId) {
  try {
    // In a real implementation, this would use the Google Docs API to create a document
    // For this demo, we'll simulate the export
    
    const documentTitle = `Meeting Transcript: ${transcript.title} - ${new Date(transcript.date).toLocaleDateString()}`;
    
    const documentContent = formatDocumentContent(transcript, summary);
    
    // Simulate API request to Google Docs
    // In a real implementation, you would use the OAuth token from the user's session
    // to authenticate with the Google Docs API
    const mockGoogleDocsResponse = {
      documentId: `doc-${Math.random().toString(36).substring(2, 11)}`,
      title: documentTitle,
      url: `https://docs.google.com/document/d/mock-id/edit`
    };
    
    // Log the export for analytics
    await logExport(userId, transcript.id, 'googleDocs');
    
    return {
      success: true,
      message: `Transcript successfully exported to Google Docs: "${documentTitle}"`,
      exportUrl: mockGoogleDocsResponse.url
    };
  } catch (error) {
    console.error('Error exporting to Google Docs:', error);
    throw new Error('Failed to export to Google Docs');
  }
}

// Export the transcript to Notion
async function exportToNotion(transcript, summary, userId) {
  try {
    // In a real implementation, this would use the Notion API to create a page
    // For this demo, we'll simulate the export
    
    const pageTitle = `Meeting Transcript: ${transcript.title} - ${new Date(transcript.date).toLocaleDateString()}`;
    
    const pageContent = formatNotionContent(transcript, summary);
    
    // Simulate API request to Notion
    // In a real implementation, you would use an integration token to authenticate with the Notion API
    const mockNotionResponse = {
      pageId: `page-${Math.random().toString(36).substring(2, 11)}`,
      title: pageTitle,
      url: `https://notion.so/mock-id`
    };
    
    // Log the export for analytics
    await logExport(userId, transcript.id, 'notion');
    
    return {
      success: true,
      message: `Transcript successfully exported to Notion: "${pageTitle}"`,
      exportUrl: mockNotionResponse.url
    };
  } catch (error) {
    console.error('Error exporting to Notion:', error);
    throw new Error('Failed to export to Notion');
  }
}

// Format content for Google Docs
function formatDocumentContent(transcript, summary) {
  let content = '';
  
  // Add title and date
  content += `# ${transcript.title}\n\n`;
  content += `Date: ${new Date(transcript.date).toLocaleDateString()}\n`;
  content += `Duration: ${transcript.duration} minutes\n\n`;
  
  // Add summary if available
  if (summary) {
    content += `## Summary\n\n${summary}\n\n`;
  }
  
  // Add transcript
  content += `## Transcript\n\n`;
  transcript.transcript_segments.forEach(segment => {
    content += `[${segment.timestamp}] ${segment.speaker}: ${segment.text}\n\n`;
  });
  
  return content;
}

// Format content for Notion
function formatNotionContent(transcript, summary) {
  // For Notion, we would structure the content into blocks
  // This is a simplified example
  const blocks = [
    {
      type: 'heading_1',
      content: transcript.title
    },
    {
      type: 'paragraph',
      content: `Date: ${new Date(transcript.date).toLocaleDateString()}`
    },
    {
      type: 'paragraph',
      content: `Duration: ${transcript.duration} minutes`
    }
  ];
  
  // Add summary if available
  if (summary) {
    blocks.push(
      {
        type: 'heading_2',
        content: 'Summary'
      },
      {
        type: 'paragraph',
        content: summary
      }
    );
  }
  
  // Add transcript
  blocks.push({
    type: 'heading_2',
    content: 'Transcript'
  });
  
  transcript.transcript_segments.forEach(segment => {
    blocks.push({
      type: 'paragraph',
      content: `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`
    });
  });
  
  return blocks;
}

// Log the export for analytics
async function logExport(userId, transcriptId, exportType) {
  try {
    // In a real implementation, this would log to a database
    console.log(`Export logged: User ${userId} exported transcript ${transcriptId} to ${exportType}`);
    return true;
  } catch (error) {
    console.error('Error logging export:', error);
    return false;
  }
}
