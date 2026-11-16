import Link from 'next/link';
export default function NotFound() { return <main className="p-10"><h1 className="heading">Page not found</h1><p className="muted">Check the invitation or return to your workspace.</p><Link href="/dashboard" className="action mt-5">Back to dashboard</Link></main>; }
