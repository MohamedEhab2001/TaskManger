import Link from 'next/link';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { stripe } from '@/lib/billing/stripe';
import { verifyPurchaseToken } from '@/lib/billing/token';
import { generateStrongPassword } from '@/lib/billing/password';
import { LIFETIME_CURRENCY, LIFETIME_PRICE_USD_CENTS } from '@/lib/billing/constants';
import { messages } from '@/lib/i18n/messages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function getLang(raw?: string): 'en' | 'ar' {
  return raw === 'ar' ? 'ar' : 'en';
}

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams?: { token?: string; session_id?: string; lang?: string };
}) {
  const lang = getLang(searchParams?.lang);
  const t = (messages as any)[lang] as any;

  const token = searchParams?.token;
  const sessionId = searchParams?.session_id;

  if (!token || !sessionId) {
    return (
      <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-xl mx-auto pt-16">
          <Card className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.errorTitle}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t.purchase.invalidLink}</p>
            <Link href="/#pricing">
              <Button>{t.purchase.backToPricing}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const payload = verifyPurchaseToken(token);
  if (!payload) {
    return (
      <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-xl mx-auto pt-16">
          <Card className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.errorTitle}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t.purchase.linkExpired}</p>
            <Link href="/#pricing">
              <Button>{t.purchase.backToPricing}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  let session: any;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    session = null;
  }

  if (!session) {
    return (
      <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-xl mx-auto pt-16">
          <Card className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.errorTitle}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t.purchase.sessionNotFound}</p>
            <Link href="/#pricing">
              <Button>{t.purchase.backToPricing}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const stripeEmail = session?.customer_details?.email || session?.customer_email || null;
  const amountTotal = session?.amount_total;
  const currency = session?.currency;

  const paid = session?.payment_status === 'paid';
  const email = stripeEmail || payload.email;

  const validAmount = amountTotal === LIFETIME_PRICE_USD_CENTS && String(currency || '').toLowerCase() === LIFETIME_CURRENCY;
  const validEmail = String(email || '').toLowerCase() === String(payload.email || '').toLowerCase();

  if (!paid || !validAmount || !validEmail) {
    return (
      <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-xl mx-auto pt-16">
          <Card className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.errorTitle}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t.purchase.paymentNotVerified}</p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/#pricing">
                <Button>{t.purchase.backToPricing}</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">{t.common.login}</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  await connectDB();

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) {
    return (
      <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-xl mx-auto pt-16">
          <Card className="p-6 space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.accountExistsTitle}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t.purchase.accountExistsBody}</p>
            <Link href="/login">
              <Button>{t.common.login}</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const password = generateStrongPassword(16);
  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    name: String(email).split('@')[0] || 'User',
    email: String(email).toLowerCase().trim(),
    passwordHash,
    role: 'user',
    plan: 'lifetime',
    subscriptionStatus: 'none',
    hasPurchasedLifetime: true,
    stripeCustomerId: session?.customer ? String(session.customer) : undefined,
    stripeLastSessionId: String(sessionId),
    lastLoginAt: new Date(),
  });

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-xl mx-auto pt-16">
        <Card className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.successTitle}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.purchase.successBody}</p>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950 space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">{t.purchase.yourCredentials}</div>
            <div className="text-sm">
              <span className="font-medium text-slate-900 dark:text-white">{t.common.email}: </span>
              <span className="text-slate-700 dark:text-slate-300">{String(email)}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-slate-900 dark:text-white">{t.common.password}: </span>
              <span className="text-slate-700 dark:text-slate-300">{password}</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">{t.purchase.credentialsOnce}</div>
          </div>

          <div className="rounded-md border border-yellow-200 dark:border-yellow-800 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-900 dark:text-yellow-200">
            {t.purchase.changePasswordNotice}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link href="/login">
              <Button>{t.purchase.goToLogin}</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
