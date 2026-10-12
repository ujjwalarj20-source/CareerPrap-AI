'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { FormField } from '@/components/auth/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, authApi } from '@/lib/api';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    try {
      if (isRegister) {
        const targetRole = String(form.get('targetRole') ?? '').trim();
        await authApi.register({
          name: String(form.get('name')),
          email,
          password,
          ...(targetRole && { targetRole }),
        });
      } else {
        await authApi.login({ email, password });
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError('Could not reach the server. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isRegister ? 'Create your account' : 'Welcome back'}</CardTitle>
          <CardDescription>
            {isRegister ? 'Start preparing for your next interview.' : 'Log in to continue your preparation.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {isRegister && (
              <FormField label="Name" name="name" autoComplete="name" required error={fieldErrors.name?.[0]} />
            )}
            <FormField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              error={fieldErrors.email?.[0]}
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
              error={fieldErrors.password?.[0]}
            />
            {isRegister && (
              <FormField
                label="Target role (optional)"
                name="targetRole"
                placeholder="e.g. Backend Engineer"
                error={fieldErrors.targetRole?.[0]}
              />
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister ? 'Already have an account? ' : 'New here? '}
            <Link className="font-medium text-foreground underline" href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
