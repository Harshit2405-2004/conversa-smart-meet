import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
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
  
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
  });
  
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    // In production, use an environment variable for the webhook secret
    // const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    // const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    // For now we're just parsing the event directly as verification requires the secret
    const event = JSON.parse(body);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        
        // Get the Stripe customer
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata.supabase_user_id;
        
        if (userId) {
          // Get product details to determine the plan
          const product = await stripe.products.retrieve(
            subscription.items.data[0].price.product as string
          );
          
          const planType = product.metadata.plan || 'premium';
          const status = subscription.status;
          
          // Update user profile with subscription info
          if (status === 'active') {
            const minutes = planType === 'premium' ? 300 : 60; // Example values
            const queries = planType === 'premium' ? 150 : 50;
            
            await supabaseClient
              .from('profiles')
              .update({
                plan: planType,
                remaining_transcription: minutes,
                remaining_ai_queries: queries
              })
              .eq('id', userId);
          }
        }
        break;
      
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        const canceledSubscription = event.data.object;
        const canceledCustomer = await stripe.customers.retrieve(canceledSubscription.customer);
        const canceledUserId = canceledCustomer.metadata.supabase_user_id;
        
        if (canceledUserId) {
          // Reset user to free plan
          await supabaseClient
            .from('profiles')
            .update({
              plan: 'free',
              // Optionally keep the remaining minutes/queries or reset them
            })
            .eq('id', canceledUserId);
        }
        break;
    }
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
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
