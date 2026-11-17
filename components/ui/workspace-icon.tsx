import type { CSSProperties } from 'react';

const paths = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  meetings: 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z M7 2v4 M17 2v4 M3 10h18 M7 14h3 M14 14h3 M7 17h3',
  schedule: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  video: 'M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M16 10l6-3v10l-6-3',
  join: 'M14 3h6v18h-6 M3 12h12 M10 7l5 5-5 5',
};
export function WorkspaceIcon({ name, style }: { name: keyof typeof paths; style?: CSSProperties }) {
  return <svg className="workspace-icon" style={style} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
