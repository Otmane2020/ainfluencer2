import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const token = Deno.env.get('HF_TOKEN')
  if (!token) {
    return new Response(JSON.stringify({ ok: false, reason: 'HF_TOKEN missing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  }
  const res = await fetch('https://huggingface.co/api/whoami-v2', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.text()
  return new Response(JSON.stringify({ ok: res.ok, status: res.status, body: body.slice(0, 500) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
  })
})
