
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
    const { timeframe = 'month' } = await req.json();

    // Calculate date range based on timeframe
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1); // Default to month
    }

    // Format dates for SQL query
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Get total transcription usage
    const { data: transcriptionUsage, error: transcriptionError } = await supabaseClient.rpc(
      'get_transcription_usage',
      { 
        user_id_param: user.id,
        start_date_param: startDateStr,
        end_date_param: endDateStr
      }
    );

    if (transcriptionError) {
      console.error('Error fetching transcription usage:', transcriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI assistant usage
    const { data: aiUsage, error: aiError } = await supabaseClient.rpc(
      'get_ai_assistant_usage',
      { 
        user_id_param: user.id,
        start_date_param: startDateStr,
        end_date_param: endDateStr
      }
    );

    if (aiError) {
      console.error('Error fetching AI assistant usage:', aiError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get meeting statistics
    const { data: meetingStats, error: meetingError } = await supabaseClient
      .from('transcripts')
      .select('id, title, date, duration')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: false });

    if (meetingError) {
      console.error('Error fetching meeting statistics:', meetingError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch analytics data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate usage statistics
    const totalMeetings = meetingStats ? meetingStats.length : 0;
    const totalMeetingMinutes = meetingStats ? meetingStats.reduce((sum, meeting) => sum + (meeting.duration || 0), 0) : 0;
    const averageMeetingLength = totalMeetings > 0 ? totalMeetingMinutes / totalMeetings : 0;
    
    // Format meeting data for charts
    const meetingsByDay = {};
    const now = new Date();
    
    // Initialize all days in the range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      meetingsByDay[dateKey] = 0;
    }
    
    // Count meetings by day
    if (meetingStats) {
      meetingStats.forEach(meeting => {
        const dateKey = new Date(meeting.date).toISOString().split('T')[0];
        if (meetingsByDay[dateKey] !== undefined) {
          meetingsByDay[dateKey]++;
        }
      });
    }
    
    // Format for chart data
    const meetingChartData = Object.entries(meetingsByDay).map(([date, count]) => ({
      date,
      meetings: count
    }));

    // Get the user profile for remaining allocations
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('remaining_transcription, remaining_ai_queries, plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare response
    const analyticsData = {
      usage: {
        transcription: {
          totalMinutes: transcriptionUsage?.total_minutes || 0,
          minutesUsed: transcriptionUsage?.minutes_used || 0,
          minutesRemaining: profile?.remaining_transcription || 0
        },
        aiAssistant: {
          totalQueries: aiUsage?.total_queries || 0,
          queriesUsed: aiUsage?.queries_used || 0,
          queriesRemaining: profile?.remaining_ai_queries || 0
        }
      },
      meetings: {
        total: totalMeetings,
        totalMinutes: totalMeetingMinutes,
        averageLength: parseFloat(averageMeetingLength.toFixed(2)),
        byDay: meetingChartData,
        recent: meetingStats?.slice(0, 5) || []
      },
      plan: profile?.plan || 'free',
      timeframe
    };

    return new Response(
      JSON.stringify(analyticsData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analytics-insights function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
