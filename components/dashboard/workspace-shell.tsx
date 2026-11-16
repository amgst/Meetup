'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MeetingProvider } from '@/components/meetings/meeting-provider';
import { SignOut } from '@/components/auth/sign-out';
import { SessionListener } from '@/components/auth/session-listener';
const navigation = [{ href: '/dashboard', label: 'Dashboard', icon: '▦' }, { href: '/meetings', label: 'My meetings', icon: '▤' }, { href: '/meetings/schedule', label: 'Schedule meeting', icon: '◷' }, { href: '/settings', label: 'Settings', icon: '⚙' }];
export function WorkspaceShell({ children, email, name }: { children: React.ReactNode; email: string; name: string }) {
  const pathname = usePathname();
  const current = navigation.find(item => item.href === pathname);
  return <MeetingProvider><SessionListener /><div className="app"><aside className="side"><Link href="/dashboard" className="brand"><div className="logo">✦</div><span>WBIFY <span className="font-medium">Meet</span></span></Link><div><p className="smallcap">WORKSPACE</p><nav className="nav" aria-label="Main navigation">{navigation.map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''} aria-current={pathname === item.href ? 'page' : undefined}><span className="ico" aria-hidden>{item.icon}</span><span>{item.label}</span></Link>)}</nav></div><div className="sideBottom"><div className="avatar">W</div><div><b>{name}</b><br /><span className="text-slate-400">Your account</span></div></div></aside><div className="content"><header className="top"><div className="topTitle">{current?.label || 'Workspace'}</div><div className="topright"><span className="pill" title={email}>{name}</span><SignOut /><span className="avatar">W</span></div></header><main className="main"><div className="notice">Meetings are saved to your account. Live video will be connected in Phase 4.</div>{children}</main></div></div><nav className="mobileNav" aria-label="Mobile navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label === 'Schedule meeting' ? 'Schedule' : item.label}</Link>)}</nav></MeetingProvider>;
}
