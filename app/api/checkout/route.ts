import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/billing/stripe';
import { signPurchaseToken } from '@/lib/billing/token';
import { LIFETIME_CURRENCY, LIFETIME_PRICE_USD_CENTS, LIFETIME_PRODUCT_NAME } from '@/lib/billing/constants';

const APP_URL = process.env.APP_URL;

if (!APP_URL) {
  throw new Error('Please define the APP_URL environment variable inside .env');
}

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'ar']).optional(),
});

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 10;

  const existing = rateLimit.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= max) return false;
  existing.count += 1;
  rateLimit.set(ip, existing);
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const json = await req.json();
    const { email, locale } = bodySchema.parse(json);

    const token = signPurchaseToken(email);
    const lang = locale || 'en';

    const successUrl = `${APP_URL}/purchase/success?token=${encodeURIComponent(token)}&session_id={CHECKOUT_SESSION_ID}&lang=${encodeURIComponent(lang)}`;
    const cancelUrl = `${APP_URL}/purchase/cancel?lang=${encodeURIComponent(lang)}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: LIFETIME_CURRENCY,
            unit_amount: LIFETIME_PRICE_USD_CENTS,
            product_data: {
              name: LIFETIME_PRODUCT_NAME,
            },
          },
        },
      ],
      metadata: {
        purchase_type: 'lifetime',
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
