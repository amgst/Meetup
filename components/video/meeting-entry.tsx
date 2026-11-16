'use client';
import dynamic from 'next/dynamic';
const VideoRoom=dynamic(()=>import('./video-room').then(module=>module.VideoRoom),{ssr:false,loading:()=> <p role="status" className="mt-5 text-slate-300">Loading meeting controls...</p>});
export function MeetingEntry(props:{roomId:string;name?:string;isHost?:boolean;configured:boolean}){return <VideoRoom {...props} />;}
