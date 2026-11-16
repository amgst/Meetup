'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent } from '@supabase/supabase-js';
export function SessionListener() {
  useEffect(() => {
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'SIGNED_OUT') window.location.replace('/login');
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
