import { QUEUE_EXPIRE_AFTER, SERVER_EXPIRE_AFTER } from "./config.js";
import { queuesCollection, serverIdsCollection, foundMatchesCollection, foundPartiesCollection } from "./database.js";
import { emptyHandler } from "./empty-handler.js";

export function createIndexes() {
  // QUEUES COLLECTION //
  // Party ID Index
  queuesCollection.createIndex({ partyId: -1 }, { name: "partyId" }).catch(emptyHandler);

  // Queue ID Index
  queuesCollection.createIndex({ queueId: -1 }, { name: "queueId" }).catch(emptyHandler);

  // Time Added Index
  queuesCollection.createIndex({ timeAdded: -1 }, { name: "timeAdded", expireAfterSeconds: QUEUE_EXPIRE_AFTER }).catch(emptyHandler);

  // SERVER IDS COLLECTION //
  // Created At Index
  serverIdsCollection.createIndex({ createdAt: -1 }, { name: "createdAt", expireAfterSeconds: SERVER_EXPIRE_AFTER }).catch(emptyHandler);

  // FOUND MATCHES COLLECTION //
  // Creatd At Index
  foundMatchesCollection.createIndex({ createdAt: -1 }, { name: "createdAt", expireAfterSeconds: SERVER_EXPIRE_AFTER }).catch(emptyHandler);

  // FOUND PARTIES COLLECTION //
  // Creatd At Index
  foundPartiesCollection.createIndex({ createdAt: -1 }, { name: "createdAt", expireAfterSeconds: SERVER_EXPIRE_AFTER }).catch(emptyHandler);
}