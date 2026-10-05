import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, roll_number, verify_url, location, template_type } = await req.json()
    
    const service_id = Deno.env.get('EMAILJS_SERVICE_ID')
    const public_key = Deno.env.get('EMAILJS_PUBLIC_KEY')
    const private_key = Deno.env.get('EMAILJS_PRIVATE_KEY') // 🆕 Private Key add kiya
    const template_id = template_type === 'verify' 
      ? Deno.env.get('EMAILJS_VERIFY_TEMPLATE_ID') 
      : Deno.env.get('EMAILJS_RESOLVED_TEMPLATE_ID')

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
        accessToken: private_key, // 🆕 Private Key yahan pass ki
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

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})