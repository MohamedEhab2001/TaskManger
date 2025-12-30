'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const { language } = useLanguage();

  const title = language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service';
  const updated = language === 'ar' ? 'آخر تحديث: 26 ديسمبر 2025' : 'Last updated: Dec 26, 2025';

  const intro =
    language === 'ar'
      ? 'باستخدامك Taskello، فإنك توافق على الشروط التالية.'
      : 'By accessing or using Taskello, you agree to these Terms of Service. If you do not agree, please do not use the service.';

  const items =
    language === 'ar'
      ? [
          { h: 'الاستخدام المقبول', p: 'استخدم الخدمة بشكل قانوني ولا تحاول إساءة استخدامها أو تعطيلها.' },
          { h: 'حسابك', p: 'أنت مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة بك.' },
          { h: 'الدفع', p: 'قد نستخدم مزود دفع خارجي لمعالجة عمليات الشراء.' },
          { h: 'إخلاء المسؤولية', p: 'يتم تقديم الخدمة كما هي دون ضمانات. نسعى دائمًا لتحسين الجودة.' },
        ]
      : [
          {
            h: '1. Acceptance of Terms',
            p: 'By accessing or using Taskello, you agree to these Terms of Service.\nIf you do not agree, please do not use the service.',
          },
          {
            h: '2. Description of Service',
            p: 'Taskello is a time-aware task management tool that helps individuals:\n\nPlan work using time estimates\nTrack progress and completion\nReflect on finished tasks\nOptionally share progress with clients',
          },
          {
            h: '3. Accounts',
            p: 'You must provide a valid email to create an account\nYou are responsible for maintaining the security of your account\nYou are responsible for all activity under your account',
          },
          {
            h: '4. Lifetime Access',
            p: 'Taskello offers a one-time payment for lifetime access.\n\n“Lifetime access” means:\nAccess for the lifetime of the product\nIncludes future updates unless explicitly stated otherwise\nNo recurring subscription fees\n\nWe reserve the right to discontinue the product in the future, but lifetime users will not be charged again.',
          },
          {
            h: '5. Refunds',
            p: 'If offered, refund terms will be clearly stated on the pricing page at the time of purchase.',
          },
          {
            h: '6. Acceptable Use',
            p: 'You agree not to:\nUse Taskello for illegal purposes\nAttempt to access other users’ data\nAbuse, overload, or attempt to reverse-engineer the service',
          },
          {
            h: '7. Client Sharing Responsibility',
            p: 'When you share a client page:\nYou are responsible for the content you share\nTaskello is not responsible for disputes between you and your clients\nShared pages are informational only',
          },
          {
            h: '8. Intellectual Property',
            p: 'Taskello and all related content, design, and functionality are owned by Taskello.\n\nYou may not copy, resell, or redistribute the service without permission.',
          },
          {
            h: '9. Service Availability',
            p: 'We aim to keep Taskello available, but:\nWe do not guarantee uninterrupted service\nMaintenance or downtime may occur',
          },
          {
            h: '10. Limitation of Liability',
            p: 'Taskello is provided “as is”.\n\nWe are not liable for:\nLost data\nLost time\nBusiness losses resulting from use of the service',
          },
          {
            h: '11. Termination',
            p: 'We reserve the right to suspend or terminate accounts that violate these terms.\n\nYou may stop using Taskello at any time.',
          },
          {
            h: '12. Changes to Terms',
            p: 'We may update these Terms of Service from time to time. Continued use of Taskello means acceptance of the updated terms.',
          },
          {
            h: '13. Contact',
            p: 'For questions regarding these Terms, contact:\n📧 hello@taskello.app',
          },
        ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{updated}</div>
        <p className="mt-6 text-slate-600 dark:text-slate-300 leading-relaxed">{intro}</p>

        <div className="mt-8 space-y-5">
          {items.map((it) => (
            <div key={it.h} className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{it.h}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{it.p}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-between gap-3 flex-wrap">
          <Link href="/">
            <Button variant="outline">{language === 'ar' ? 'العودة' : 'Back'}</Button>
          </Link>
          <Link href="/privacy">
            <Button>{language === 'ar' ? 'الخصوصية' : 'Privacy'}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
