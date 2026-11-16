'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useMeetings } from './meeting-provider';
import type { Meeting } from '@/types/meeting';
function localDate(time:number){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function EditMeetingDialog({meeting,onClose}:{meeting:Meeting;onClose:()=>void}){
  const {edit}=useMeetings();const [pending,setPending]=useState(false);const [error,setError]=useState('');
  return <Dialog title="Edit meeting" onClose={onClose}><form className="mt-5" onSubmit={async e=>{e.preventDefault();setPending(true);setError('');const values=new FormData(e.currentTarget);try{await edit(meeting.id,{title:String(values.get('title')),notes:String(values.get('notes')),scheduled:meeting.scheduled,when:meeting.scheduled?new Date(String(values.get('date'))).getTime():meeting.when});onClose();}catch(err){setError(err instanceof Error?err.message:'Could not update meeting.');}finally{setPending(false);}}}><div className="formRow"><label htmlFor="edit-title">Meeting title</label><input id="edit-title" name="title" required maxLength={80} defaultValue={meeting.title} /></div>{meeting.scheduled&&<div className="formRow"><label htmlFor="edit-date">Date and time</label><input id="edit-date" name="date" type="datetime-local" required defaultValue={localDate(meeting.when)} /><p className="hint">Your device timezone.</p></div>}<div className="formRow"><label htmlFor="edit-notes">Meeting notes</label><textarea id="edit-notes" name="notes" maxLength={180} defaultValue={meeting.notes} /></div>{error&&<p role="alert" className="error">{error}</p>}<button className="action" disabled={pending}>{pending?'Saving...':'Save changes'}</button></form></Dialog>;
}
