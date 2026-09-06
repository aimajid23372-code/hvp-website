import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ZiniPay API Integration
    const ziniPayResponse = await fetch('https://api.zinipay.com/v1/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZINIPAY_API_KEY}`
      },
      body: JSON.stringify({
        amount: body.amount,
        customer_email: body.email,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
      })
    });
    
    const data = await ziniPayResponse.json();
    return NextResponse.json({ url: data.payment_url });
  } catch (error) {
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 });
  }
}