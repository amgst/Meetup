import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock
from livekit import rtc
from agent import TranscriptWorker, may_transcribe


class ConsentTests(unittest.IsolatedAsyncioTestCase):
    async def test_audio_subscription_stops_without_consent(self):
        publication = SimpleNamespace(source=rtc.TrackSource.SOURCE_MICROPHONE, subscribed=False, sid='mic', track=None)
        publication.set_subscribed = lambda value: setattr(publication, 'subscribed', value)
        participant = SimpleNamespace(kind=rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD, attributes={}, track_publications={'mic': publication})
        room = SimpleNamespace(metadata='{"wbify.transcription":"active"}', remote_participants={'speaker': participant})
        worker = TranscriptWorker(room, SimpleNamespace(aclose=AsyncMock()))
        worker.sync()
        self.assertFalse(publication.subscribed)
        participant.attributes['wbify.transcriptionConsent'] = '1'
        worker.sync()
        self.assertTrue(publication.subscribed)
        participant.attributes['wbify.transcriptionConsent'] = '0'
        worker.sync()
        self.assertFalse(publication.subscribed)
        await worker.close()

    def test_only_explicit_active_consent(self):
        self.assertFalse(may_transcribe('{}', {'wbify.transcriptionConsent': '1'}))
        self.assertFalse(may_transcribe('{"wbify.transcription":"active"}', {}))
        self.assertFalse(may_transcribe('invalid', {'wbify.transcriptionConsent': '1'}))
        self.assertTrue(may_transcribe('{"wbify.transcription":"active"}', {'wbify.transcriptionConsent': '1'}))

    async def test_no_text_after_consent_withdrawal_or_host_stop(self):
        output = AsyncMock()
        room = SimpleNamespace(metadata='{"wbify.transcription":"active"}', local_participant=SimpleNamespace(send_text=output))
        participant = SimpleNamespace(identity='guest-example', name='Speaker', attributes={})
        worker = TranscriptWorker(room, SimpleNamespace(aclose=AsyncMock()))
        await worker.publish(participant, 'Not permitted')
        output.assert_not_awaited()
        participant.attributes['wbify.transcriptionConsent'] = '1'
        await worker.publish(participant, 'Hello team')
        output.assert_awaited_once()
        message = json.loads(output.await_args.args[0])
        self.assertEqual(message['speakerName'], 'Speaker')
        self.assertEqual(message['text'], 'Hello team')
        participant.attributes['wbify.transcriptionConsent'] = '0'
        await worker.publish(participant, 'Do not forward')
        self.assertEqual(output.await_count, 1)
        room.metadata = '{"wbify.transcription":"off"}'
        participant.attributes['wbify.transcriptionConsent'] = '1'
        await worker.publish(participant, 'Still off')
        self.assertEqual(output.await_count, 1)
        await worker.close()


if __name__ == '__main__':
    unittest.main()
