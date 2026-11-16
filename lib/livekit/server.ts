import 'server-only';
import { RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import { z } from 'zod';
const configSchema = z.object({
  url: z.url().refine(v => /^wss?:\/\//.test(v), 'LIVEKIT_URL must use wss:// or ws://'),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
});
export function getLiveKitConfig() { return configSchema.parse({ url: process.env.LIVEKIT_URL, apiKey: process.env.LIVEKIT_API_KEY, apiSecret: process.env.LIVEKIT_API_SECRET }); }
export function isLiveKitConfigured() { return configSchema.safeParse({url:process.env.LIVEKIT_URL,apiKey:process.env.LIVEKIT_API_KEY,apiSecret:process.env.LIVEKIT_API_SECRET}).success; }
export function createRoomService() {
  const { url, apiKey, apiSecret } = getLiveKitConfig();
  return new RoomServiceClient(url.replace(/^ws/, 'http'), apiKey, apiSecret);
}
export function createWebhookReceiver() {
  const { apiKey, apiSecret } = getLiveKitConfig();
  return new WebhookReceiver(apiKey, apiSecret);
}
