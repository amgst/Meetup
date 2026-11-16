# Meeting transcription worker

An explicitly dispatched LiveKit Cloud worker uses LiveKit Inference speech-to-text (Deepgram Nova-3, English by default). No LLM, TTS, audio recording or Supabase credentials are used. LiveKit supplies deployed worker credentials. Worker and inference usage count toward the project's plan.

## App setup

Apply `supabase/migrations/202611160004_interactions.sql` after the earlier migrations. Set these in the app's `.env.local` and Vercel environment settings, then redeploy the app:

```env
TRANSCRIPTION_ENABLED=true
TRANSCRIPTION_AGENT_NAME=wbify-transcriber
```

Retain the existing server-only `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. Never prefix server credentials with `NEXT_PUBLIC_`.

The worker identified in `livekit.toml` is already deployed in US East. To update the same worker, run `lk agent deploy` from this directory with project credentials supplied through the CLI environment. Use `lk agent status` and `lk agent logs` to inspect health. Do not run `agent create` for updates.

For local development with Python 3.13, from the repository root:

```powershell
python -m venv .venv-transcription
.venv-transcription/Scripts/python.exe -m pip install -r agents/transcription/requirements.txt
.venv-transcription/Scripts/python.exe agents/transcription/agent.py dev
```

The source checkout loads the root ignored `.env.local`; Docker only copies requirements and worker source. Avoid running a local worker while the cloud worker is registered with the same agent name when testing a specific deployment.

Optional worker settings: `TRANSCRIPTION_MODEL=deepgram/nova-3`, `TRANSCRIPTION_LANGUAGE=en`. Configure these on the worker and redeploy it to change language/model. Vercel settings do not configure the separate worker.

## Behavior

The host starts transcription in the Transcript panel. Each speaker explicitly opts in through the room banner; consent defaults off on joining. The worker subscribes only to consenting participants' microphone tracks. Withdrawing consent unsubscribes and cancels recognition. Host stop disables transcription in room metadata, then deletes the worker dispatch. An empty room also shuts down the job.

Final text is broadcast with speaker name and timestamp. Browsers accept it only from LiveKit agent participants. Each browser retains up to 2,000 segments in its current meeting session; download TXT before leaving. Late joiners receive new text only. There is no server transcript archive or audio recording. Participant-provided display names are not verified legal identities.

## Verification

```powershell
.venv-transcription/Scripts/python.exe -m unittest discover -s agents/transcription -p test_agent.py
npm.cmd run test:db
npm.cmd run test:e2e -- tests/interactions.spec.ts tests/layouts.spec.ts tests/video.spec.ts
```

Unit tests cover consent, withdrawal and suppressing output after stop. Browser tests use an isolated control-plane double and simulated participants, including rejection of forged transcript text. Live inference access was checked with generated silence. Production acceptance still requires a real host/guest call: start, opt in, speak, verify speaker names/text, withdraw consent, stop and download.
