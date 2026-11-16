'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="p-10"><h1 className="heading">Something went wrong</h1><p className="muted">Try loading the workspace again.</p><button onClick={reset} className="action mt-5">Try again</button></main>; }
