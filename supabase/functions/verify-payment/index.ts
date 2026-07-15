import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { reference, deviceId } = await req.json()

    if (!reference || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'reference and deviceId are required' }),
        { status: 400 }
      )
    }

    const authHeader = req.headers.get('Authorization')
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } }
    )
    const verifyData = await verifyResponse.json()

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return new Response(
        JSON.stringify({ success: false, message: 'Payment not confirmed yet' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // service_role key: only usable here, on Supabase's server, never on the phone.
    // This is what lets us write to the database ignoring RLS, safely.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    await supabaseAdmin.from('licenses').insert({
      user_id: user.id,
      device_fingerprint: deviceId,
      payment_reference: reference,
      amount_kobo: verifyData.data.amount,
      paid_at: new Date().toISOString(),
      is_active: true,
    })

    await supabaseAdmin.from('devices').upsert(
      { user_id: user.id, device_fingerprint: deviceId, is_locked: false },
      { onConflict: 'device_fingerprint' }
    )

    await supabaseAdmin.from('profiles').update({ is_paid: true }).eq('id', user.id)

    // ============================================================
    // AFFILIATE COMMISSION — runs only if this student was referred
    // ============================================================
    // Check if this student has a referral record that hasn't been
    // paid out yet. We check has_paid = false so that if this function
    // somehow runs twice for the same student, we never credit the
    // affiliate a second time.
    const { data: referral } = await supabaseAdmin
      .from('referred_students')
      .select('id, affiliate_id, has_paid')
      .eq('student_id', user.id)
      .maybeSingle()

    if (referral && !referral.has_paid) {
      // Get the commission rule as it stands RIGHT NOW. We snapshot
      // it into affiliate_earnings so that if you change the rule
      // later, this student's commission record stays historically
      // accurate.
      const { data: settings } = await supabaseAdmin
        .from('commission_settings')
        .select('commission_type, commission_value')
        .eq('id', 1)
        .single()

      if (settings) {
        const studentPaymentAmount = verifyData.data.amount / 100 // kobo → naira

        const commissionAmount =
          settings.commission_type === 'percentage'
            ? (studentPaymentAmount * settings.commission_value) / 100
            : settings.commission_value // flat amount, in naira

        await supabaseAdmin.from('affiliate_earnings').insert({
          affiliate_id: referral.affiliate_id,
          student_id: user.id,
          amount: commissionAmount,
          commission_type: settings.commission_type,
          commission_value: settings.commission_value,
          student_payment_amount: studentPaymentAmount,
        })

        await supabaseAdmin
          .from('referred_students')
          .update({ has_paid: true, paid_at: new Date().toISOString() })
          .eq('id', referral.id)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})