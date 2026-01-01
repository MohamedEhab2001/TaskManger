
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, BarChart3, CheckCircle2, Clock, FileText, KeyRound, Sparkles, Target, Timer } from 'lucide-react';

function isValidEmail(email: string) {
  const v = email.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function SectionTitle({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      {subtitle ? <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/70 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-300/80 dark:bg-slate-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-300/80 dark:bg-slate-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-300/80 dark:bg-slate-700" />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">taskello.app</div>
        <div className="w-10" />
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function HeroPreviewCollage() {
  const items = [
    { src: '/preview/1.png', alt: 'Taskello preview 1' },
    { src: '/preview/2.png', alt: 'Taskello preview 2' },
    { src: '/preview/3.png', alt: 'Taskello preview 3' },
    { src: '/preview/4.png', alt: 'Taskello preview 4' },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {items.map((it) => (
          <div
            key={it.src}
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50"
          >
            <Image src={it.src} alt={it.alt} fill className="object-contain" priority />
          </div>
        ))}
      </div>

      <div className="relative hidden sm:block">
        <div className="relative h-[360px] md:h-[420px]">
          <div className="absolute left-0 top-10 w-[72%]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 shadow-lg">
              <Image src={items[0].src} alt={items[0].alt} fill className="object-contain" priority />
            </div>
          </div>

          <div className="absolute right-0 top-0 w-[56%] rotate-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 shadow-md">
              <Image src={items[1].src} alt={items[1].alt} fill className="object-contain" priority />
            </div>
          </div>

          <div className="absolute right-2 bottom-0 w-[60%] -rotate-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 shadow-md">
              <Image src={items[2].src} alt={items[2].alt} fill className="object-contain" priority />
            </div>
          </div>

          <div className="absolute left-6 bottom-2 w-[46%] rotate-1">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 shadow-md">
              <Image src={items[3].src} alt={items[3].alt} fill className="object-contain" priority />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { language, setLanguage, messages: t } = useLanguage();
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyEmail, setBuyEmail] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [previewOk, setPreviewOk] = useState(true);

  const emailOk = useMemo(() => isValidEmail(buyEmail), [buyEmail]);

  async function startCheckout() {
    const email = buyEmail.trim();
    if (!isValidEmail(email)) {
      // TODO(i18n): landing.checkoutInvalidEmail
      setBuyError((t as any)?.landing?.checkoutInvalidEmail || null);
      return;
    }

    setBuyLoading(true);
    setBuyError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale: language }),
      });
      const json = await res.json();

      if (!res.ok || !json?.url) {
        throw new Error(json?.error || 'Checkout failed');
      }

      window.location.href = json.url;
    } catch {
      setBuyError(t.landing.checkoutFailed);
    } finally {
      setBuyLoading(false);
    }
  }

  return (
    <div
      className={`min-h-screen ${language === 'ar' ? 'rtl' : 'ltr'} bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(37,99,235,0.10),transparent_55%),radial-gradient(900px_circle_at_70%_0%,rgba(37,99,235,0.06),transparent_60%)] bg-slate-50 dark:bg-slate-950`}
    >
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-950/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative h-9 w-9 overflow-hidden">
                <Image src="/brand/logo.png" alt={t.landing.brand} fill className="object-contain" priority />
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{t.landing.brand}</span>
            </div>

            <div className="hidden md:flex items-center gap-7 text-sm text-slate-600 dark:text-slate-300">
              <a href="#why" className="hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.navWhy}
              </a>
              <a href="#how" className="hover:text-slate-900 dark:hover:text-white transition">
                {/* TODO(i18n): landing.navHow */}
                {(t as any)?.landing?.navHow}
              </a>
              <a href="#preview" className="hover:text-slate-900 dark:hover:text-white transition">
                {/* TODO(i18n): landing.navPreview */}
                {(t as any)?.landing?.navPreview}
              </a>
              <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.navPricing}
              </a>
              <a href="#faqs" className="hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.navFaqs}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost">{t.landing.login}</Button>
              </Link>
              <Button className="gap-2" onClick={() => setBuyOpen(true)}>
                {t.landing.buyLifetimeAccess}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <header className="px-4 sm:px-6 pt-14 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t.landing.microTrust}
              </div>

              <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Stop guessing where your time went.
                <br />
                Plan it. Track it. Prove it.
              </h1>

              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Taskello helps you plan tasks with real time estimates, track what actually happens, and reflect on
                completion — without distractions or fake productivity.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="gap-2" onClick={() => setBuyOpen(true)}>
                  {t.landing.buyLifetimeAccess}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    {t.landing.login}
                  </Button>
                </Link>
              </div>

              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">One-time $25. No subscription.</div>

              <div className="mt-6 text-sm text-slate-600 dark:text-slate-300">
                {/* TODO(i18n): landing.socialProof */}
                {(t as any)?.landing?.socialProof}
              </div>
            </div>

            <div className="lg:col-span-6">
              <BrowserFrame>
                <HeroPreviewCollage />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </header>

      <section id="why" className="px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="Why time breaks trust — even when work is good" subtitle={t.landing.whyBody} />
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.landing.problem1Title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.landing.problem1Desc}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.landing.problem2Title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.landing.problem2Desc}</div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.landing.problem3Title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.landing.problem3Desc}</div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/50 dark:bg-slate-950/40 p-5 text-sm text-slate-700 dark:text-slate-300">
            {t.landing.solutionLine}
          </div>
        </div>
      </section>

      <section id="how" className="px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title={
              // TODO(i18n): landing.howTitle
              (t as any)?.landing?.howTitle
            }
            subtitle={
              // TODO(i18n): landing.howSubtitle
              (t as any)?.landing?.howSubtitle
            }
          />

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  {/* TODO(i18n): landing.howStep1Title */}
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.howStep1Title}</div>
                  {/* TODO(i18n): landing.howStep1Desc */}
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.howStep1Desc}</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  {/* TODO(i18n): landing.howStep2Title */}
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.howStep2Title}</div>
                  {/* TODO(i18n): landing.howStep2Desc */}
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.howStep2Desc}</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  {/* TODO(i18n): landing.howStep3Title */}
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.howStep3Title}</div>
                  {/* TODO(i18n): landing.howStep3Desc */}
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.howStep3Desc}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SectionTitle
            title={
              // TODO(i18n): landing.spotlightTitle
              (t as any)?.landing?.spotlightTitle
            }
            subtitle={
              // TODO(i18n): landing.spotlightSubtitle
              (t as any)?.landing?.spotlightSubtitle
            }
          />

          <div className="mt-8 grid gap-3">
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {/* TODO(i18n): landing.featureTimeAwareHomeTitle */}
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.featureTimeAwareHomeTitle}</div>
                {/* TODO(i18n): landing.featureTimeAwareHomeDesc */}
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.featureTimeAwareHomeDesc}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {/* TODO(i18n): landing.featureReflectionTitle */}
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.featureReflectionTitle}</div>
                {/* TODO(i18n): landing.featureReflectionDesc */}
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.featureReflectionDesc}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {/* TODO(i18n): landing.featureInsightsTitle */}
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.featureInsightsTitle}</div>
                {/* TODO(i18n): landing.featureInsightsDesc */}
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.featureInsightsDesc}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {/* TODO(i18n): landing.featureProofPageTitle */}
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.featureProofPageTitle}</div>
                {/* TODO(i18n): landing.featureProofPageDesc */}
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.featureProofPageDesc}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {/* TODO(i18n): landing.featureWorkspaceVariablesTitle */}
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{(t as any)?.landing?.featureWorkspaceVariablesTitle}</div>
                {/* TODO(i18n): landing.featureWorkspaceVariablesDesc */}
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{(t as any)?.landing?.featureWorkspaceVariablesDesc}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="preview" className="px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <SectionTitle title={t.landing.previewTitle} subtitle={t.landing.previewDesc} />
              <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.landing.previewNote}</div>
            </div>

            <div className="lg:col-span-7">
              <BrowserFrame>
                {previewOk ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/50">
                    <Image
                      src="/preview/dashboard.png"
                      alt="Dashboard preview"
                      fill
                      className="object-contain"
                      onError={() => setPreviewOk(false)}
                      priority
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] w-full rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-900/30">
                    <div className="h-full w-full animate-pulse" />
                  </div>
                )}
              </BrowserFrame>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title={t.landing.pricingTitle} subtitle={t.landing.pricingSubtitle} />

          <div className="mt-8 grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-950/60 shadow-sm p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.landing.lifetimePlanTitle}</div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.landing.lifetimePlanDesc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold text-slate-900 dark:text-white">{t.landing.lifetimePrice}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.landing.lifetimePriceHint}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.lifetimeInclude1}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.lifetimeInclude2}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.lifetimeInclude3}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.lifetimeInclude4}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button className="gap-2 flex-1" size="lg" onClick={() => setBuyOpen(true)}>
                    {t.landing.buyLifetimeAccess}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Link href="/login" className="flex-1">
                    <Button className="w-full" size="lg" variant="outline">
                      {t.landing.login}
                    </Button>
                  </Link>
                </div>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t.landing.lifetimeFinePrint}</div>

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  {/* TODO(i18n): landing.refundNote */}
                  {(t as any)?.landing?.refundNote}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/50 dark:bg-slate-950/40 p-6">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.landing.forWhoTitle}</div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.forWho1}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.forWho2}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-600">•</span>
                    <span>{t.landing.forWho3}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faqs" className="px-4 sm:px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title={t.landing.faqTitle} subtitle={t.landing.faqSubtitle} />

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">What does “lifetime purchase” mean?</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You pay once and keep access forever.
                <br />
                No subscriptions, no renewals, no hidden limits.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Can I share progress with clients?</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Yes. You can generate a clean, read-only client page for a specific project or tag — showing real
                progress, time spent, and completion status.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">How does the timer work?</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                The timer is tied to task state.
                <br />
                It can automatically start on Doing, pause on Hold, and stop on Done — so time stays honest without
                micromanagement.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Is this monitoring or surveillance?</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                No. Taskello does not track screens, activity, or behavior.
                <br />
                It focuses only on your tasks, your time, and proof you choose to share.
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Why Taskello instead of Jira, Asana, or other task tools?
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Jira and similar tools are built for teams, processes, and coordination.
                <br />
                Taskello is built for individuals who sell time, outcomes, or deliverables.
                <div className="mt-3" />
                It focuses on:
                <div className="mt-2 space-y-1">
                  <div>Time awareness instead of workflow complexity</div>
                  <div>Real completion instead of endless task movement</div>
                  <div>Proof of work instead of internal coordination</div>
                </div>
                <div className="mt-3" />
                If you work solo and need clarity — not overhead — Taskello fits better.
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Button className="gap-2" size="lg" onClick={() => setBuyOpen(true)}>
              {t.landing.buyLifetimeAccess}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="px-4 sm:px-6 py-10 border-t border-slate-200/70 dark:border-slate-800/70">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-8 overflow-hidden">
                  <Image src="/brand/logo.png" alt={t.landing.brand} fill className="object-contain" priority />
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.landing.brand}</div>
              </div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm">{t.landing.footerTagline}</div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.footerPrivacy}
              </Link>
              <Link href="/terms" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.footerTerms}
              </Link>
              <Link href="/contact" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.footerContact}
              </Link>
            </div>
          </div>

          <div className="mt-8 text-xs text-slate-500 dark:text-slate-500">{t.landing.footerCopyright}</div>
        </div>
      </footer>

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.landing.buyDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t.landing.buyDialogBody}</p>
            <div className="space-y-2">
              <Label htmlFor="buyEmail">{t.common.email}</Label>
              <Input
                id="buyEmail"
                type="email"
                value={buyEmail}
                onChange={(e) => {
                  setBuyEmail(e.target.value);
                  if (buyError) setBuyError(null);
                }}
                placeholder="you@example.com"
                disabled={buyLoading}
              />
              {buyError ? <div className="text-sm text-red-600">{buyError}</div> : null}
            </div>

            <Button type="button" className="w-full gap-2" onClick={startCheckout} disabled={buyLoading || !emailOk}>
              {buyLoading ? (
                t.common.loading
              ) : (
                <>
                  {t.landing.buyDialogCta}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5" />
              {/* TODO(i18n): landing.checkoutMicroTrust */}
              {(t as any)?.landing?.checkoutMicroTrust}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/*
        Required new i18n keys (t.landing.*):
        - navHow
        - navPreview
        - heroHeadlineSales
        - heroSubtitleSales
        - socialProof
        - heroWidgetToday
        - heroWidgetTodayHint
        - heroWidgetOverdue
        - heroWidgetOverdueHint
        - heroWidgetCompletion
        - heroWidgetCompletionHint
        - howTitle
        - howSubtitle
        - howStep1Title
        - howStep1Desc
        - howStep2Title
        - howStep2Desc
        - howStep3Title
        - howStep3Desc
        - spotlightTitle
        - spotlightSubtitle
        - featureTimeAwareHomeTitle
        - featureTimeAwareHomeDesc
        - featureReflectionTitle
        - featureReflectionDesc
        - featureInsightsTitle
        - featureInsightsDesc
        - featureProofPageTitle
        - featureProofPageDesc
        - previewImageNote
        - refundNote (optional)
        - checkoutMicroTrust
        - checkoutInvalidEmail
      */}
    </div>
  );
}
