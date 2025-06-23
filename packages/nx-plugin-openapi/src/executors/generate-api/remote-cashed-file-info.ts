import { z } from 'zod';

export interface RemoteCashedFileInfo {
  hash: string;
  timestamp: number;
  remoteUrl: string;
}

export const RemoteCashedFileInfoSchema = z.object({
  hash: z.string(),
  timestamp: z.number(),
  remoteUrl: z.string().url(),
});
