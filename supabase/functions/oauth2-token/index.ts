
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get the request data
    const { scope, service } = await req.json();
    
    if (!scope || !service) {
      throw new Error('Missing required parameters: scope or service');
    }
    
    // Generate a secure token with expiration (simplified example)
    // In production, use a more secure token generation method
    const token = {
      user_id: user.id,
      scope: scope,
      service: service,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiration
    };
    
    // For demo purposes, we're just returning the token
    // In a real implementation, you would save this token in a secure storage
    // and implement proper OAuth2 flows with refresh tokens
    
    return new Response(
      JSON.stringify({ access_token: btoa(JSON.stringify(token)), token_type: 'Bearer', expires_in: 3600 }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
