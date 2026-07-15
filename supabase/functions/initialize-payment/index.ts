import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { email, deviceId } = await req.json()

    if (!email || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'email and deviceId are required' }),
        { status: 400 }
      )
    }

    // Confirm this request is coming from a logged-in student
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const reference = `PassOnce-${deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}-${Date.now()}`

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: 10000, // price lives here now, on the server, so the app can't tamper with it
        reference,
        currency: 'NGN',
        metadata: { device_id: deviceId, user_id: user.id },
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ error: paystackData.message || 'Could not initialize payment' }),
        { status: 400 }
      )
    }

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})