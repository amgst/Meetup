import { WorkspaceShell } from '@/components/dashboard/workspace-shell';
import { requireUser } from '@/lib/auth/user';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { client, user } = await requireUser();
  const { data: profile } = await client.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
  return <WorkspaceShell key={user.id} email={user.email || ''} name={profile?.display_name || user.email?.split('@')[0] || 'Your workspace'}>{children}</WorkspaceShell>;
}
