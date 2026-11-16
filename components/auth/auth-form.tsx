'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { emailSchema, passwordSchema } from '@/lib/auth/validation';
type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';
export function AuthForm({ mode, linkError = false }: { mode: Mode; linkError?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(linkError ? 'This email link is invalid or expired. Request a new one below.' : '');
  const [message, setMessage] = useState('');
  const titles = { login: 'Welcome back', register: 'Create your account', forgot: 'Forgot your password?', reset: 'Set a new password', verify: 'Verify your email' };
  const actions = { login: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Update password', verify: 'Resend verification email' };
  return <div className="min-h-screen bg-slate-50 px-5 py-12"><div className="mx-auto max-w-md"><Link href="/login" className="brand mb-8 !text-slate-900"><span className="logo">✦</span>WBIFY Meet</Link><form className="formCard !m-0 !max-w-none" onSubmit={async e => {
    e.preventDefault(); if (pending) return;
    setPending(true); setError(''); setMessage('');
    const form = e.currentTarget;
    const values = new FormData(form);
    try {
      const client = createClient();
      const email = mode !== 'reset' ? emailSchema.parse(String(values.get('email')).trim()) : '';
      const password = ['login','register','reset'].includes(mode) ? passwordSchema.parse(String(values.get('password'))) : '';
      const callback = `${window.location.origin}/auth/callback`;
      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Unable to sign in. Check your email/password and confirm your email first.');
        window.location.assign('/dashboard');
      } else if (mode === 'register') {
        const name = String(values.get('name')).trim();
        if (!name || name.length > 80) throw new Error('Enter a name of up to 80 characters.');
        const { error } = await client.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: callback } });
        if (error) throw error;
        setMessage('Check your email for a confirmation link. If you already have an account, sign in or reset your password.');
        form.reset();
      } else if (mode === 'forgot') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${callback}?next=/reset-password` });
        if (error) throw new Error('Unable to send a reset link right now. Please try again shortly.');
        setMessage('If an account exists for this email, you will receive a password reset link.');
      } else if (mode === 'verify') {
        const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: callback } });
        if (error) throw new Error('Unable to resend right now. Please try again shortly.');
        setMessage('Check your email for a verification link.');
      } else {
        if (password !== values.get('confirm')) throw new Error('The passwords do not match.');
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) throw new Error('Request a fresh password reset link first.');
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) throw signOutError;
        window.location.assign('/login?updated=1');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setPending(false); }
  }}><h1 className="heading !text-2xl">{titles[mode]}</h1><p className="muted mb-6">{mode === 'verify' ? 'Confirm your email before opening your workspace.' : 'Your conversations start here.'}</p>{mode === 'register' && <div className="formRow"><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required maxLength={80} /></div>}{mode !== 'reset' && <div className="formRow"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>}{['login','register','reset'].includes(mode) && <div className="formRow"><label htmlFor="password">{mode === 'reset' ? 'New password' : 'Password'}</label><input id="password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={128} /></div>}{mode === 'reset' && <div className="formRow"><label htmlFor="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></div>}{error && <p className="error break-words" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}<button className="action w-full justify-center" disabled={pending}>{pending ? 'Please wait…' : actions[mode]}</button><div className="mt-6 flex flex-wrap gap-4 text-sm text-indigo-600">{mode !== 'login' && <Link href="/login">Sign in</Link>}{mode === 'login' && <><Link href="/register">Create account</Link><Link href="/forgot-password">Forgot password?</Link><Link href="/verify-email">Resend verification</Link></>}</div></form></div></div>;
}
