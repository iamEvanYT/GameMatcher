import type { WithId } from "mongodb";
import type { QueueConfig } from "types/queues.js";
import type { QueueDocument } from "types/queueDocument.js";

export type Algorithm<T extends QueueConfig> = (cfg: T, services: Services) => Promise<void>;

export type Services = {
  getOldestParties: (queueId: string, limit?: number) => Promise<WithId<QueueDocument>[]>;
  updatePartyRange?: (partyId: string, rankedMin: number, rankedMax: number) => Promise<void>;
  createMatch: (queueData: QueueConfig, teams: number[][], partiesUsed: string[]) => Promise<any>;
  now: () => Date;
  log?: (message: string, meta?: Record<string, unknown>) => void;
};
