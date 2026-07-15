Deno.serve(async (req) => {
  try {
    const { accountNumber, bankCode } = await req.json()

    if (!accountNumber || !bankCode) {
      return new Response(
        JSON.stringify({ error: 'accountNumber and bankCode are required' }),
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } }
    )
    const data = await response.json()

    if (!data.status) {
      return new Response(
        JSON.stringify({ error: 'Could not verify this account number. Please check it and try again.' }),
        { status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ accountName: data.data.account_name }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})