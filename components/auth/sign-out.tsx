'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export function SignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <div><button className="join" disabled={pending} onClick={async () => {
    setPending(true); setError('');
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      window.location.replace('/login');
    } catch { setError('Unable to sign out. Please retry.'); setPending(false); }
  }}>{pending ? 'Signing out?' : 'Sign out'}</button>{error && <p role="alert" className="error">{error}</p>}</div>;
}
