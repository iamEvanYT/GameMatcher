import { Collection, Db, MongoClient } from 'mongodb'
import { dbName, foundMatchesCollectionName, foundPartiesCollectionName, queuesCollectionName, serverIdsCollectionName, mongoUrl } from './config.js'
import { QueueDocument } from 'types/queueDocument.js'
import { ServerDocument } from 'types/serverDocument.js'
import { FoundMatchDocument } from 'types/foundMatchDocument.js'
import { FoundPartyDocument } from 'types/foundPartyDocument.js'

// Connect to MongoDB
export const client = new MongoClient(mongoUrl)
await client.connect()

export const database: Db = client.db(dbName)

export const queuesCollection: Collection<QueueDocument> = database.collection(queuesCollectionName)
export const serverIdsCollection: Collection<ServerDocument> = database.collection(serverIdsCollectionName)

export const foundMatchesCollection: Collection<FoundMatchDocument> = database.collection(foundMatchesCollectionName)
export const foundPartiesCollection: Collection<FoundPartyDocument> = database.collection(foundPartiesCollectionName)

console.log('Connected to MongoDB')