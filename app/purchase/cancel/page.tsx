import Link from 'next/link';
import { messages } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PurchaseCancelPage({
  searchParams,
}: {
  searchParams?: { lang?: 'en' | 'ar' };
}) {
  const lang = searchParams?.lang === 'ar' ? 'ar' : 'en';
  const t = (messages as any)[lang] as any;

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-900 p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-xl mx-auto pt-16">
        <Card className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.purchase.cancelTitle}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.purchase.cancelBody}</p>
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
