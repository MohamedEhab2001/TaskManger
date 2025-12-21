'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Shield, Zap, TrendingUp, Globe, Target, BarChart3, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  const { language, setLanguage, messages: t } = useLanguage();

  const features = [
    { icon: Calendar, title: t.landing.feature1Title, desc: t.landing.feature1Desc },
    { icon: Shield, title: t.landing.feature2Title, desc: t.landing.feature2Desc },
    { icon: Zap, title: t.landing.feature3Title, desc: t.landing.feature3Desc },
    { icon: TrendingUp, title: t.landing.feature4Title, desc: t.landing.feature4Desc },
    { icon: Globe, title: t.landing.feature5Title, desc: t.landing.feature5Desc },
    { icon: Target, title: t.landing.feature6Title, desc: t.landing.feature6Desc },
  ];

  const pricing = [
    {
      name: t.landing.planFree,
      price: t.landing.free,
      features: [
        t.landing.basicFeatures,
        `${t.landing.limited} 100 ${t.landing.tasks}`,
        t.landing.smartPlanner,
        t.landing.burnoutGuard,
      ],
      cta: t.landing.signup,
      href: '/signup',
    },
    {
      name: t.landing.planPro,
      price: '$9',
      period: t.landing.perMonth,
      features: [
        t.landing.basicFeatures,
        `${t.landing.unlimited} ${t.landing.tasks}`,
        t.landing.smartPlanner,
        t.landing.burnoutGuard,
        t.landing.advancedAnalytics,
        t.landing.prioritySupport,
      ],
      cta: t.landing.signup,
      href: '/signup',
      popular: true,
    },
    {
      name: t.landing.planTeam,
      price: t.landing.comingSoon,
      features: [
        t.landing.basicFeatures,
        `${t.landing.unlimited} ${t.landing.tasks}`,
        t.landing.smartPlanner,
        t.landing.burnoutGuard,
        t.landing.advancedAnalytics,
        t.landing.teamCollaboration,
      ],
      cta: t.landing.comingSoon,
      href: '#',
      disabled: true,
    },
  ];

  const faqs = [
    { q: t.landing.faq1Q, a: t.landing.faq1A },
    { q: t.landing.faq2Q, a: t.landing.faq2A },
    { q: t.landing.faq3Q, a: t.landing.faq3A },
    { q: t.landing.faq4Q, a: t.landing.faq4A },
    { q: t.landing.faq5Q, a: t.landing.faq5A },
    { q: t.landing.faq6Q, a: t.landing.faq6A },
  ];

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-900 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <span className={`${language === 'ar' ? 'mr-2' : 'ml-2'} text-xl font-bold text-slate-900 dark:text-white`}>
                {t.landing.brand}
              </span>
            </div>
            <div className={`hidden md:flex items-center ${language === 'ar' ? 'space-x-reverse' : ''} space-x-8`}>
              <a href="#features" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.features}
              </a>
              <a href="#pricing" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.pricing}
              </a>
              <a href="#faqs" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
                {t.landing.faqs}
              </a>
            </div>
            <div className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : ''} space-x-4`}>
              <button
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="px-3 py-1 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                {language === 'en' ? 'ع' : 'EN'}
              </button>
              <Link href="/login">
                <Button variant="ghost">{t.landing.ctaSecondary}</Button>
              </Link>
              <Link href="/signup">
                <Button>{t.landing.signup}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
            {t.landing.heroHeadline}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
            {t.landing.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button size="lg" className="px-8 py-6 text-lg">
                {t.landing.ctaPrimary}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                {t.landing.ctaSecondary}
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t.landing.socialProof}
          </p>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-12">
            {t.landing.featuresTitle}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-lg transition transform hover:-translate-y-1"
              >
                <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-6">
            {t.landing.uspTitle}
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="p-8 bg-white dark:bg-slate-900 rounded-lg shadow-md">
              <Calendar className="h-16 w-16 text-blue-600 mb-4" />
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                {t.landing.feature1Title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                {t.landing.uspPlanner}
              </p>
            </div>
            <div className="p-8 bg-white dark:bg-slate-900 rounded-lg shadow-md">
              <Shield className="h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                {t.landing.feature2Title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                {t.landing.uspBurnout}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            {t.landing.analyticsTitle}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-12">
            {t.landing.analyticsDesc}
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <p className="text-slate-900 dark:text-white font-semibold">Completion Rates</p>
            </div>
            <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-slate-900 dark:text-white font-semibold">Time Analytics</p>
            </div>
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <p className="text-slate-900 dark:text-white font-semibold">Task Health</p>
            </div>
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Zap className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <p className="text-slate-900 dark:text-white font-semibold">Friction Scores</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-12">
            {t.landing.pricingTitle}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-lg border-2 ${
                  plan.popular
                    ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-xl'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Popular
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-slate-600 dark:text-slate-400">{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={plan.disabled}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faqs" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-12">
            {t.landing.faqTitle}
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {faq.q}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Target className="h-8 w-8 text-blue-500" />
                <span className={`${language === 'ar' ? 'mr-2' : 'ml-2'} text-xl font-bold`}>{t.landing.brand}</span>
              </div>
              <p className="text-slate-400">{t.landing.tagline}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.landing.features}</h4>
              <ul className="space-y-2 text-slate-400">
                <li>{t.landing.feature1Title}</li>
                <li>{t.landing.feature2Title}</li>
                <li>{t.landing.feature3Title}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t.landing.contact}</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    {t.landing.footerPrivacy}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    {t.landing.footerTerms}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    {t.landing.footerContact}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            {t.landing.footerCopyright}
          </div>
        </div>
      </footer>
    </div>
  );
}
