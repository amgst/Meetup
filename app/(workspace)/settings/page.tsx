import { requireUser } from '@/lib/auth/user';
import { ProfileForm } from '@/components/auth/profile-form';
export default async function Settings() {
  const { client, user } = await requireUser();
  const { data, error } = await client.from('profiles').select('display_name,timezone').eq('id',user.id).single();
  return <><p className="eyebrow">YOUR WORKSPACE</p><h1 className="heading">Profile and settings</h1><ProfileForm email={user.email || ''} name={data?.display_name || ''} timezone={data?.timezone || 'UTC'} setupError={!!error} /></>;
}
