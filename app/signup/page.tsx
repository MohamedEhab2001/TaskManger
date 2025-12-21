'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signupAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/context';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { language, messages: t } = useLanguage();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError(t.signup.passwordsMustMatch);
      setLoading(false);
      return;
    }

    const result = await signupAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t.signup.title}
          </CardTitle>
          <CardDescription className="text-center">
            {t.signup.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.signup.name}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t.signup.namePlaceholder}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.signup.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t.signup.emailPlaceholder}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.signup.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t.signup.passwordPlaceholder}
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.signup.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t.signup.passwordPlaceholder}
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t.common.loading : t.signup.createAccount}
            </Button>
            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              {t.signup.alreadyHaveAccount}{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                {t.signup.loginLink}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
