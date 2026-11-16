import { AuthForm } from '@/components/auth/auth-form';
import { requireUser } from '@/lib/auth/user';
export default async function Reset() { await requireUser(); return <AuthForm mode="reset" />; }
