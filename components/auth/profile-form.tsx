'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/app/(workspace)/actions';
import Link from 'next/link';
export function ProfileForm({ email, name, timezone, setupError }: { email: string; name: string; timezone: string; setupError: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  return <form className="formCard" onSubmit={async e => {
    e.preventDefault(); setPending(true); setError(''); setMessage('');
    const values = new FormData(e.currentTarget);
    try {
      const result = await saveProfile({ display_name: values.get('display_name'), timezone: values.get('timezone') });
      if (result.error) setError(result.error);
      else { setMessage('Profile saved.'); router.refresh(); }
    } catch { setError('Could not save your profile. Please retry.'); }
    finally { setPending(false); }
  }}><h2>Your profile</h2>{setupError && <p className="notice">Profile setup is pending. Apply the Phase 2 database migration, then reload.</p>}<div className="formRow"><label htmlFor="account-email">Email</label><input id="account-email" type="email" value={email} readOnly /><p className="hint">Your verified sign-in address.</p></div><div className="formRow"><label htmlFor="display-name">Display name</label><input id="display-name" name="display_name" defaultValue={name} required maxLength={80} autoComplete="name" /></div><div className="formRow"><label htmlFor="timezone">Preferred timezone</label><input id="timezone" name="timezone" defaultValue={timezone} required maxLength={100} list="timezones" /><datalist id="timezones">{['UTC','Asia/Karachi','Asia/Dubai','Europe/London','America/New_York','America/Los_Angeles'].map(zone => <option key={zone} value={zone} />)}</datalist><p className="hint">Preference for future invitations. Meeting times currently display in your device timezone.</p></div>{error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}<button className="action" disabled={pending || setupError}>{pending ? 'Saving?' : 'Save profile'}</button><Link href="/forgot-password" className="ml-5 text-sm text-indigo-600">Reset password</Link></form>;
}
