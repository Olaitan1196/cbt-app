Deno.serve(async (req) => {
  try {
    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` },
    })
    const data = await response.json()

    if (!data.status) {
      return new Response(JSON.stringify({ error: 'Could not fetch bank list' }), { status: 500 })
    }

    // Only send back what the dropdown actually needs — name + code
    const banks = data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
    }))

    return new Response(JSON.stringify({ banks }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})