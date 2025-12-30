'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const { language } = useLanguage();

  const title = language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy';
  const updated = language === 'ar' ? 'آخر تحديث: 26 ديسمبر 2025' : 'Last updated: Dec 26, 2025';

  const intro =
    language === 'ar'
      ? 'نحترم خصوصيتك. يوضح هذا المستند ما نجمعه وكيف نستخدمه.'
      : 'Taskello (“we”, “our”, “us”) respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use Taskello.';

  const items =
    language === 'ar'
      ? [
          { h: 'ما الذي نجمعه', p: 'قد نجمع بريدك الإلكتروني وبيانات المهام والوسوم والوقت الذي تتبعه داخل التطبيق.' },
          { h: 'كيف نستخدم البيانات', p: 'نستخدم البيانات لتشغيل التطبيق وتحسينه وتقديم التحليلات التي تراها.' },
          { h: 'مشاركة البيانات', p: 'لا نبيع بياناتك. قد نستخدم مزودين خارجيين لتشغيل الخدمات (مثل الدفع) عند الحاجة.' },
          { h: 'الحذف', p: 'يمكنك طلب حذف بياناتك عبر صفحة التواصل.' },
        ]
      : [
          {
            h: '1. Introduction',
            p: 'Taskello is a personal productivity and task management tool designed for individuals.',
          },
          {
            h: '2. Information We Collect',
            p: 'a. Information you provide\n\nEmail address (for account creation and login)\nTasks, tags, time estimates, and completion data you enter\nOptional notes and reflections you add to tasks\n\nb. Payment information\n\nPayments are processed securely by Stripe. We do not store your credit card details.\n\nWe may store:\nYour email\nPayment status (active / lifetime access)',
          },
          {
            h: '3. How We Use Your Information',
            p: 'We use your information to:\nProvide and operate Taskello\nCreate and manage your account\nTrack tasks, time, and completion metrics\nGenerate insights and progress summaries\nEnable optional client share pages (only when you explicitly share them)',
          },
          {
            h: '4. Client Share Pages',
            p: 'If you choose to share a client page:\nOnly the data related to the selected tasks/tags is visible\nYour private workspace and other tasks remain hidden\nYou control what is shared and can disable access at any time',
          },
          {
            h: '5. Data Storage & Security',
            p: 'We take reasonable measures to protect your data, including:\nSecure authentication\nEncrypted connections (HTTPS)\nRestricted access to production systems\n\nNo system is 100% secure, but we work to keep your data safe.',
          },
          {
            h: '6. Cookies',
            p: 'Taskello uses essential cookies only:\nAuthentication\nSession management\n\nWe do not use advertising or tracking cookies.',
          },
          {
            h: '7. Your Rights',
            p: 'You have the right to:\nAccess your data\nUpdate or delete your account\nRequest data removal by contacting us',
          },
          {
            h: '8. Data Deletion',
            p: 'If you delete your account:\nYour personal data and tasks are permanently removed from our systems\nShared client pages are disabled',
          },
          {
            h: '9. Changes to This Policy',
            p: 'We may update this Privacy Policy from time to time. Changes will be reflected on this page.',
          },
          {
            h: '10. Contact',
            p: 'If you have questions about this Privacy Policy, contact us at:\n📧 hello@taskello.app',
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
          <Link href="/contact">
            <Button>{language === 'ar' ? 'تواصل معنا' : 'Contact'}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
