import { AuthForm } from '@/components/auth/auth-form';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const params = await searchParams;
  return <>{params.updated && <p role="status" className="notice !m-0 text-center">Password updated. Sign in with your new password.</p>}<AuthForm mode="login" linkError={params.error === 'link'} /></>;
}
