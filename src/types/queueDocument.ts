export interface QueueDocument {
  _id: string; // Party ID
  userIds: number[];
  queueId: string;
  timeAdded: Date;

  // ranked specific
  rankedValue?: number;
  rankedMax?: number;
  rankedMin?: number;
}
