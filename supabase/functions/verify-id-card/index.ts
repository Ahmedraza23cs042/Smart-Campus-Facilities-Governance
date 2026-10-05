import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. Define CORS headers at the top
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // (Production mein isay localhost:5173 / apne domain se replace karein)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 2. Handle the OPTIONS (Preflight) request FIRST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, roll_number, verify_url, location, template_type } = await req.json()
    
    const service_id = Deno.env.get('EMAILJS_SERVICE_ID')
    const public_key = Deno.env.get('EMAILJS_PUBLIC_KEY')
    const template_id = template_type === 'verify' 
      ? Deno.env.get('EMAILJS_VERIFY_TEMPLATE_ID') 
      : Deno.env.get('EMAILJS_RESOLVED_TEMPLATE_ID')

    // Check if secrets are missing
    if (!service_id || !public_key || !template_id) {
        throw new Error('Missing EmailJS environment variables. Please set secrets.')
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id,
        template_id,
        user_id: public_key,
        template_params: { 
          to_email, 
          roll_number, 
          verify_url, 
          location,
          reply_to: 'admin@smartcampus.muet' 
        }
      })
    })

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`EmailJS failed: ${errText}`)
    }

    // 3. Return success WITH CORS headers
    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    })

  } catch (error) {
    // 4. Return error WITH CORS headers (Most important part!)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})