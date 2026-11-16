"""Explicitly dispatched, consent-gated STT worker. No LLM, TTS or audio recording."""
import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentServer, AutoSubscribe, inference, stt

_source = Path(__file__).resolve()
if len(_source.parents) > 2:
    load_dotenv(_source.parents[2] / ".env.local")
logger = logging.getLogger("wbify.transcription")
TOPIC = "wbify.transcript.v1"


def may_transcribe(metadata: str, attributes: dict) -> bool:
    try:
        state = json.loads(metadata or "{}")
        return isinstance(state, dict) and state.get("wbify.transcription") == "active" and attributes.get("wbify.transcriptionConsent") == "1"
    except (ValueError, TypeError):
        return False


class TranscriptWorker:
    def __init__(self, room, speech_engine, audio_factory=rtc.AudioStream):
        self.room = room
        self.engine = speech_engine
        self.audio_factory = audio_factory
        self.tasks: dict[str, asyncio.Task] = {}
        self.closed = False

    def allowed(self, participant) -> bool:
        return not self.closed and may_transcribe(self.room.metadata, participant.attributes)

    def sync(self):
        for participant in self.room.remote_participants.values():
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT:
                continue
            allowed = self.allowed(participant)
            for publication in participant.track_publications.values():
                if publication.source != rtc.TrackSource.SOURCE_MICROPHONE:
                    continue
                if publication.subscribed != allowed:
                    publication.set_subscribed(allowed)
                task = self.tasks.get(publication.sid)
                if not allowed:
                    if task:
                        task.cancel()
                    continue
                if publication.track is not None and (task is None or task.done()):
                    task = asyncio.create_task(self.transcribe(participant, publication))
                    self.tasks[publication.sid] = task
                    task.add_done_callback(lambda _task, sid=publication.sid: self.finished(sid, _task))

    def finished(self, sid, task):
        if self.tasks.get(sid) is task:
            self.tasks.pop(sid, None)
        if not self.closed and not task.cancelled():
            # Provider/network failures retry without logging speech content.
            asyncio.get_running_loop().call_later(3, self.sync)

    async def publish(self, participant, text: str):
        if not self.allowed(participant) or not text.strip():
            return
        message = {
            "id": str(uuid4()), "speakerIdentity": participant.identity,
            "speakerName": (participant.name or "Guest")[:80], "text": text.strip()[:8000],
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        await self.room.local_participant.send_text(json.dumps(message), topic=TOPIC)

    async def transcribe(self, participant, publication):
        audio = self.audio_factory(publication.track, sample_rate=16000, num_channels=1)
        try:
            async with self.engine.stream() as recognition:
                async def feed():
                    async for event in audio:
                        if not self.allowed(participant):
                            break
                        recognition.push_frame(event.frame)
                    recognition.end_input()
                feeder = asyncio.create_task(feed())
                try:
                    async for event in recognition:
                        if event.type == stt.SpeechEventType.FINAL_TRANSCRIPT and event.alternatives:
                            await self.publish(participant, event.alternatives[0].text)
                finally:
                    feeder.cancel()
                    await asyncio.gather(feeder, return_exceptions=True)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.warning("Speech-to-text stream failed; retrying if consent remains active")
        finally:
            await audio.aclose()

    async def close(self):
        self.closed = True
        tasks = list(self.tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await self.engine.aclose()


server = AgentServer(num_idle_processes=0)


@server.rtc_session(agent_name=os.getenv("TRANSCRIPTION_AGENT_NAME", "wbify-transcriber"))
async def entrypoint(ctx: agents.JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_NONE)
    engine = inference.STT(model=os.getenv("TRANSCRIPTION_MODEL", "deepgram/nova-3"), language=os.getenv("TRANSCRIPTION_LANGUAGE", "en"))
    worker = TranscriptWorker(ctx.room, engine)
    ctx.add_shutdown_callback(worker.close)
    await ctx.room.local_participant.set_attributes({"wbify.transcriber": "1"})

    @ctx.room.on("room_metadata_changed")
    def metadata_changed(_metadata):
        worker.sync()

    @ctx.room.on("participant_attributes_changed")
    def attributes_changed(_changed, _participant):
        worker.sync()

    @ctx.room.on("track_published")
    def published(_publication, _participant):
        worker.sync()

    @ctx.room.on("track_subscribed")
    def subscribed(_track, _publication, _participant):
        worker.sync()

    @ctx.room.on("track_unsubscribed")
    def unsubscribed(_track, publication, _participant):
        task = worker.tasks.get(publication.sid)
        if task:
            task.cancel()

    @ctx.room.on("participant_disconnected")
    def disconnected(participant):
        for publication in participant.track_publications.values():
            task = worker.tasks.get(publication.sid)
            if task:
                task.cancel()
        async def stop_if_empty():
            await asyncio.sleep(10)
            if not any(p.kind != rtc.ParticipantKind.PARTICIPANT_KIND_AGENT for p in ctx.room.remote_participants.values()):
                ctx.shutdown("No meeting participants remain")
        asyncio.create_task(stop_if_empty())

    worker.sync()


if __name__ == "__main__":
    agents.cli.run_app(server)
