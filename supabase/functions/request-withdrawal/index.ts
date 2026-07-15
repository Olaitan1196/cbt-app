import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { amount, bankCode, accountNumber, accountName } = await req.json()

    if (!amount || !bankCode || !accountNumber || !accountName) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400 }
      )
    }

    // Confirm who is actually making this request
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id, status, paystack_recipient_code')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!affiliate) {
      return new Response(JSON.stringify({ error: 'Affiliate account not found' }), { status: 404 })
    }

    if (affiliate.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Your affiliate account is not active' }), { status: 403 })
    }

    // ============================================================
    // RECALCULATE THE BALANCE OURSELVES — never trust the amount
    // the browser sends. A dishonest request could claim any
    // number; we only pay out what our own records prove is owed.
    // ============================================================
    const { data: earningsRows } = await supabaseAdmin
      .from('affiliate_earnings')
      .select('amount')
      .eq('affiliate_id', affiliate.id)

    const totalEarned = earningsRows
      ? earningsRows.reduce((sum, row) => sum + Number(row.amount), 0)
      : 0

    const { data: withdrawalRows } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .select('amount')
      .eq('affiliate_id', affiliate.id)
      .in('status', ['pending', 'processing', 'success'])

    const totalWithdrawn = withdrawalRows
      ? withdrawalRows.reduce((sum, row) => sum + Number(row.amount), 0)
      : 0

    const availableBalance = totalEarned - totalWithdrawn

    if (amount > availableBalance) {
      return new Response(
        JSON.stringify({ error: `You can only withdraw up to ₦${availableBalance.toLocaleString()}` }),
        { status: 400 }
      )
    }

    if (amount < 1000) {
      return new Response(
        JSON.stringify({ error: 'Minimum withdrawal amount is ₦1,000' }),
        { status: 400 }
      )
    }

    // ============================================================
    // REGISTER (OR REUSE) THIS AFFILIATE'S PAYSTACK RECIPIENT
    // A "recipient" is Paystack's record of WHERE to send money.
    // We only need to create it once per affiliate, then reuse it.
    // ============================================================
    let recipientCode = affiliate.paystack_recipient_code

    if (!recipientCode) {
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        }),
      })
      const recipientData = await recipientResponse.json()

      if (!recipientData.status) {
        return new Response(
          JSON.stringify({ error: 'Could not register your bank account with Paystack' }),
          { status: 500 }
        )
      }

      recipientCode = recipientData.data.recipient_code

      // Save bank details + recipient code so future withdrawals skip this step
      await supabaseAdmin
        .from('affiliates')
        .update({
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          paystack_recipient_code: recipientCode,
        })
        .eq('id', affiliate.id)
    }

    // Create the withdrawal record FIRST, as "pending" — this way, even
    // if the Paystack call below fails, we have a paper trail.
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .insert({
        affiliate_id: affiliate.id,
        amount,
        status: 'pending',
      })
      .select()
      .single()

    if (withdrawalError) {
      return new Response(JSON.stringify({ error: 'Could not create withdrawal record' }), { status: 500 })
    }

    // ============================================================
    // FIRE THE ACTUAL TRANSFER
    // ============================================================
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100), // naira → kobo
        recipient: recipientCode,
        reason: 'PassOnce affiliate commission withdrawal',
      }),
    })
    const transferData = await transferResponse.json()

    if (!transferData.status) {
      // Mark the withdrawal as failed, but keep the record for your own tracking
      await supabaseAdmin
        .from('affiliate_withdrawals')
        .update({
          status: 'failed',
          failure_reason: transferData.message || 'Transfer failed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal.id)

      return new Response(
        JSON.stringify({ error: transferData.message || 'Transfer failed. Please try again or contact support.' }),
        { status: 500 }
      )
    }

    // Paystack transfers can come back as "success" immediately, or
    // "otp" if your account still requires OTP confirmation (see the
    // note from earlier — you'll want to disable OTP with Paystack
    // support for this to be fully automatic).
    const newStatus = transferData.data.status === 'success' ? 'success' : 'processing'

    await supabaseAdmin
      .from('affiliate_withdrawals')
      .update({
        status: newStatus,
        paystack_transfer_code: transferData.data.transfer_code,
        processed_at: newStatus === 'success' ? new Date().toISOString() : null,
      })
      .eq('id', withdrawal.id)

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})