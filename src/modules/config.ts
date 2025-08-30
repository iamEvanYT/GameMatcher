import { QueueConfigs } from "types/queues.js";

// Load Environment Variables
export const authKey = process.env.AuthKey;
export const mongoUrl = process.env.MongoUrl || "mongodb://localhost:27017";
export const port = parseInt(process.env.Port || "3000");
export const environment = process.env.Environment || "Testing";

// Database
export const dbName = "Matchmaking";

export const queuesCollectionName = "queues";
export const serverIdsCollectionName = "servers";

export const foundMatchesCollectionName = "foundMatches";
export const foundPartiesCollectionName = "foundParties";

// Queues
export const queues: QueueConfigs = [
  {
    queueId: "Ranked2v2",
    queueType: "ranked",

    usersPerTeam: 2,
    teamsPerMatch: 2,

    discoverMatchesInterval: 5,

    searchRange: [0, 0],
    incrementRange: [1, 1]
  }
] as const;
export const validQueueIds = ["Ranked2v2"] as const;

// Database Configurations
export const QUEUE_EXPIRE_AFTER = 60 * 60 * 2; // 2 hours in seconds
export const SERVER_EXPIRE_AFTER = 60 * 60 * 2; // 2 hours in seconds
export const MATCHES_EXPIRE_AFTER = 10 * 60; // 10 minutes in seconds
