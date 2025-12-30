'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Mail, Copy, Check } from 'lucide-react';

export default function ContactPage() {
  const { language } = useLanguage();
  const supportEmail = 'hello@taskello.app';
  const [copied, setCopied] = useState(false);

  const title = language === 'ar' ? 'تواصل' : 'Contact';
  const subtitle =
    language === 'ar'
      ? 'للدعم أو الاستفسارات، أرسل بريدًا إلكترونيًا وسنرد عليك بأسرع وقت.'
      : 'For support or questions, send us an email and we’ll get back to you as soon as possible.';

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed">{subtitle}</p>

        <div className="mt-8 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'ar' ? 'راسلنا عبر البريد الإلكتروني' : 'Email us'}
              </div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {language === 'ar' ? 'نستقبل الرسائل على:' : 'Send your message to:'}
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/50 px-4 py-3 font-mono text-sm text-slate-900 dark:text-white">
                  {supportEmail}
                </div>

                <div className="flex gap-2">
                  <a href={`mailto:${supportEmail}`}>
                    <Button className="gap-2">
                      <Mail className="h-4 w-4" />
                      {language === 'ar' ? 'فتح البريد' : 'Open email'}
                    </Button>
                  </a>
                  <Button variant="outline" className="gap-2" type="button" onClick={copyEmail}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? (language === 'ar' ? 'تم النسخ' : 'Copied') : language === 'ar' ? 'نسخ' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'نقرأ كل الرسائل. أرسل عنوانًا واضحًا واذكر رابط حسابك أو لقطة شاشة إذا لزم الأمر.'
                  : 'We read every email. Include a clear subject and add your account email or a screenshot if needed.'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-between gap-3 flex-wrap">
          <Link href="/">
            <Button variant="outline">{language === 'ar' ? 'العودة' : 'Back'}</Button>
          </Link>
          <div className="flex gap-2">
            <Link href="/privacy">
              <Button variant="ghost">{language === 'ar' ? 'الخصوصية' : 'Privacy'}</Button>
            </Link>
            <Link href="/terms">
              <Button variant="ghost">{language === 'ar' ? 'الشروط' : 'Terms'}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
