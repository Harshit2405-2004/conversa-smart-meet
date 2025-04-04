
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

    // Get the request body
    const { transcriptId, exportType, addSummary } = await req.json();

    if (!transcriptId || !exportType) {
      return new Response(
        JSON.stringify({ error: 'Missing transcript ID or export type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if export type is supported
    if (!['googleDocs', 'notion'].includes(exportType)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported export type. Supported types: googleDocs, notion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the transcript details
    const { data: transcript, error: transcriptError } = await supabaseClient
      .from('transcripts')
      .select('id, title, date, duration')
      .eq('id', transcriptId)
      .eq('user_id', user.id)
      .single();

    if (transcriptError || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Generate a summary if requested
    let summary = null;
    if (addSummary) {
      const apiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Google Cloud API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Concatenate transcript text for summarization
      const transcriptText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

      // Call Vertex AI API to generate summary
      try {
        const vertexAIResponse = await fetch(
          `https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/text-bison:predict?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{
                content: `
                  Please provide a comprehensive summary of the following meeting transcript.
                  Include the main topics discussed, key decisions made, action items, and any important deadlines.
                  Format the summary with clear sections.
                  
                  TRANSCRIPT:
                  ${transcriptText}
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
          throw new Error(`Vertex AI API error: ${vertexAIResponse.status}`);
        }

        const summaryData = await vertexAIResponse.json();
        summary = summaryData.predictions[0].content;
      } catch (error) {
        console.error('Error generating summary:', error);
        // Continue without summary if it fails
        summary = "Failed to generate summary.";
      }
    }

    // Format content based on export type
    let exportContent;
    let exportUrl = null;

    if (exportType === 'googleDocs') {
      // Format for Google Docs
      exportContent = formatForGoogleDocs(transcript, segments, summary);
      
      // Call Google Docs API to create document
      const docsApiKey = Deno.env.get('GOOGLE_DOCS_API_KEY');
      if (!docsApiKey) {
        return new Response(
          JSON.stringify({ error: 'Google Docs API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        // Create the Google Doc (simplified for example)
        const docsResponse = await fetch(
          `https://docs.googleapis.com/v1/documents?key=${docsApiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${/* This would be the user's OAuth token */}`
            },
            body: JSON.stringify({
              title: `Meeting: ${transcript.title}`,
              body: {
                content: exportContent
              }
            })
          }
        );
        
        if (!docsResponse.ok) {
          throw new Error(`Google Docs API error: ${docsResponse.status}`);
        }
        
        const docsData = await docsResponse.json();
        exportUrl = `https://docs.google.com/document/d/${docsData.documentId}/edit`;
      } catch (error) {
        console.error('Error exporting to Google Docs:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to export to Google Docs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (exportType === 'notion') {
      // Format for Notion
      exportContent = formatForNotion(transcript, segments, summary);
      
      // Call Notion API to create page
      const notionApiKey = Deno.env.get('NOTION_API_KEY');
      if (!notionApiKey) {
        return new Response(
          JSON.stringify({ error: 'Notion API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        // Create the Notion page (simplified for example)
        const notionResponse = await fetch(
          'https://api.notion.com/v1/pages',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${notionApiKey}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
              parent: { database_id: '/* Database ID would be configured or provided by user */' },
              properties: {
                title: {
                  title: [
                    {
                      text: {
                        content: `Meeting: ${transcript.title}`
                      }
                    }
                  ]
                }
              },
              children: exportContent
            })
          }
        );
        
        if (!notionResponse.ok) {
          throw new Error(`Notion API error: ${notionResponse.status}`);
        }
        
        const notionData = await notionResponse.json();
        exportUrl = notionData.url;
      } catch (error) {
        console.error('Error exporting to Notion:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to export to Notion' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Save export record in database
    const { error: exportError } = await supabaseClient
      .from('transcript_exports')
      .insert({
        transcript_id: transcriptId,
        user_id: user.id,
        export_type: exportType,
        url: exportUrl
      });
      
    if (exportError) {
      console.error('Error saving export record:', exportError);
      // Continue even if saving the record fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        exportUrl,
        message: `Successfully exported transcript to ${exportType === 'googleDocs' ? 'Google Docs' : 'Notion'}`
      }),
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

// Helper function to format for Google Docs
function formatForGoogleDocs(transcript, segments, summary) {
  // In a real implementation, this would format content properly for the Google Docs API
  // This is a simplified example
  const formattedContent = {
    elements: [
      {
        sectionBreak: {
          marginTop: {
            magnitude: 1,
            unit: 'PT'
          }
        }
      },
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: `Meeting: ${transcript.title}\n`,
                textStyle: {
                  bold: true,
                  fontSize: {
                    magnitude: 18,
                    unit: 'PT'
                  }
                }
              }
            }
          ]
        }
      },
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: `Date: ${new Date(transcript.date).toLocaleDateString()}\n`,
              }
            }
          ]
        }
      },
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: `Duration: ${transcript.duration} minutes\n\n`,
              }
            }
          ]
        }
      }
    ]
  };
  
  // Add summary if available
  if (summary) {
    formattedContent.elements.push(
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: 'Meeting Summary\n',
                textStyle: {
                  bold: true,
                  fontSize: {
                    magnitude: 14,
                    unit: 'PT'
                  }
                }
              }
            }
          ]
        }
      },
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: `${summary}\n\n`,
              }
            }
          ]
        }
      }
    );
  }
  
  // Add transcript heading
  formattedContent.elements.push(
    {
      paragraph: {
        elements: [
          {
            textRun: {
              content: 'Transcript\n',
              textStyle: {
                bold: true,
                fontSize: {
                  magnitude: 14,
                  unit: 'PT'
                }
              }
            }
          }
        ]
      }
    }
  );
  
  // Add each segment
  segments.forEach(segment => {
    formattedContent.elements.push(
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: `[${segment.timestamp}] ${segment.speaker}: `,
                textStyle: {
                  bold: true
                }
              }
            },
            {
              textRun: {
                content: `${segment.text}\n`,
              }
            }
          ]
        }
      }
    );
  });
  
  return formattedContent;
}

// Helper function to format for Notion
function formatForNotion(transcript, segments, summary) {
  // In a real implementation, this would format content properly for the Notion API
  // This is a simplified example
  const blocks = [];
  
  // Add header
  blocks.push(
    {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `Meeting: ${transcript.title}`
            }
          }
        ]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `Date: ${new Date(transcript.date).toLocaleDateString()}`
            }
          }
        ]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `Duration: ${transcript.duration} minutes`
            }
          }
        ]
      }
    }
  );
  
  // Add summary if available
  if (summary) {
    blocks.push(
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: 'Meeting Summary'
              }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: summary
              }
            }
          ]
        }
      }
    );
  }
  
  // Add transcript heading
  blocks.push(
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'Transcript'
            }
          }
        ]
      }
    }
  );
  
  // Add each segment
  segments.forEach(segment => {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `[${segment.timestamp}] ${segment.speaker}: `,
            },
            annotations: {
              bold: true
            }
          },
          {
            type: 'text',
            text: {
              content: segment.text
            }
          }
        ]
      }
    });
  });
  
  return blocks;
}
