import { notFound } from 'next/navigation';
import '@livekit/components-styles';
import '@/app/room/room.css';
import { ConferenceFixture } from '@/tests/support/conference-fixture';
// Never available in a production build; uses SDK simulation, not real calls.
export default function ConferenceTest(){if(process.env.WBIFY_TEST_BUILD!=='1')notFound();return <ConferenceFixture />;}
