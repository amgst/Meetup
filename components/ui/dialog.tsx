'use client';
import { useEffect, useRef } from 'react';
export function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} onCancel={onClose} className="modal m-auto border-0 backdrop:bg-slate-950/70"><button className="close" onClick={onClose} aria-label="Close dialog">×</button><h2>{title}</h2>{children}</dialog>;
}
