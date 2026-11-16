import { z } from 'zod';
export const reactionEmoji=['👍','👏','❤️','😂','🎉'] as const;
export const reactionSchema=z.object({emoji:z.enum(reactionEmoji)}).strict();
export const transcriptTopic='wbify.transcript.v1';
export const transcriptSchema=z.object({
  id:z.string().min(1).max(100),speakerIdentity:z.string().min(1).max(150),
  speakerName:z.string().min(1).max(80),text:z.string().min(1).max(8000),
  timestamp:z.string().datetime(),
}).strict();
export type TranscriptLine=z.infer<typeof transcriptSchema>;
