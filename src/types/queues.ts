type BasicQueueConfig = {
  queueId: string;

  usersPerTeam: number;
  teamsPerMatch: number;

  discoverMatchesInterval: number;
};

type NormalQueueConfig = BasicQueueConfig & {
  queueType: "normal";
};
type DynamicQueueConfig = BasicQueueConfig & {
  queueType: "dynamic";

  minUsersPerTeam: number;
  maxUsersPerTeam: number;

  timeElaspedToUseMinimumUsers: number;
};
type RankedQueueConfig = BasicQueueConfig & {
  queueType: "ranked";

  searchRange: [number, number];
  incrementRange: [number, number];
  incrementRangeMax?: [number, number];
};

export type QueueConfig = NormalQueueConfig | DynamicQueueConfig | RankedQueueConfig;
export type QueueConfigs = QueueConfig[];
