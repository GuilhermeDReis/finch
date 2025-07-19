import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Belvo token request received');

    const belvoSecretId = Deno.env.get('BELVO_SECRET_ID');
    const belvoSecretPassword = Deno.env.get('BELVO_SECRET_PASSWORD');

    if (!belvoSecretId || !belvoSecretPassword) {
      console.error('Missing Belvo credentials');
      return new Response(
        JSON.stringify({ error: 'Missing Belvo credentials' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create base64 encoded credentials for Basic Auth
    const credentials = btoa(`${belvoSecretId}:${belvoSecretPassword}`);

    console.log('Making request to Belvo API for access token');

    // Request access token from Belvo
    const belvoResponse = await fetch('https://sandbox.belvo.com/api/tokens/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!belvoResponse.ok) {
      const errorText = await belvoResponse.text();
      console.error('Belvo API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get Belvo access token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const belvoData = await belvoResponse.json();
    console.log('Successfully received Belvo access token');

    return new Response(
      JSON.stringify({ access_token: belvoData.access }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in belvo-token function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});