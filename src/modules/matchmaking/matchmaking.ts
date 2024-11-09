import type { ObjectId, WithId } from "mongodb";
import type { FoundMatchDocument } from "types/foundMatchDocument.js";
import type { QueueConfig } from "types/queues.js";
import { queues } from "../config.js";
import { foundMatchesCollection, foundPartiesCollection, queuesCollection, serverIdsCollection } from "../database.js";
import { emptyHandler } from "../empty-handler.js";
import { findRankedMatch } from "./algorithms/ranked.js";

export async function getPartyMatch(partyId: string): Promise<WithId<FoundMatchDocument> | null> {
    const matchId: ObjectId | null = await foundPartiesCollection.findOne({ _id: partyId }).then(foundParty => {
        if (foundParty && foundParty.matchId) {
            return foundParty.matchId;
        }
        return null;
    }).catch(() => null);

    if (matchId) {
        return await foundMatchesCollection.findOne({
            _id: matchId
        }).then(match => {
            if (match) {
                return match
            }
            return null
        }).catch(() => null)
    }
    return null
}

export async function createMatch(queueData: QueueConfig, teams: number[][], partiesUsed: string[]) {
    const { queueId } = queueData;

    const currentDate = new Date();

    // find and delete a server access code
    const serverResult = await serverIdsCollection.findOneAndDelete(
        {},
        { sort: { createdAt: 1 } }
    )

    const serverAccessToken = serverResult?._id
    if (!serverAccessToken) {
        return {
            success: false,
            status: "NoServerAccessCode"
        }
    }

    // create the match
    const insertedMatchId: ObjectId | null = await foundMatchesCollection.insertOne({
        teams,
        serverAccessToken,
        queueId,
        createdAt: currentDate
    }).then(result => {
        return result.insertedId;
    }).catch(() => null);

    if (!insertedMatchId) {
        return {
            success: false,
            status: "FailedToCreateMatch"
        }
    }

    // remove the parties from the queue
    queuesCollection.deleteMany({ _id: { $in: partiesUsed } }).catch(emptyHandler);

    // Insert found parties into the foundPartiesCollection
    foundPartiesCollection.insertMany(
        partiesUsed.map(partyId => ({
            _id: partyId,
            matchId: insertedMatchId,
            createdAt: currentDate
        }))
    ).catch(emptyHandler);

    console.log("found match", queueId, insertedMatchId.toString())

    return {
        success: true,
        status: "CreatedMatch"
    }
}

export async function discoverMatches(queueId: string) {
    const queueData = queues.find(q => q.queueId === queueId);
    if (!queueData) {
        return false;
    }

    const {
        queueType
    } = queueData;

    switch (queueType) {
        case "normal":
            // TODO
            break
        case "dynamic":
            // TODO
            break
        case "ranked":
            await findRankedMatch(queueData);
            break
    }
}

let matchmakingInitialized = false;
export function initMatchmaking() {
    if (matchmakingInitialized) {
        return;
    }
    matchmakingInitialized = true;

    for (const queue of queues) {
        const { queueId, discoverMatchesInterval } = queue;
        
        // Start an async function to handle the loop for each queue
        (async () => {
            while (true) {
                await discoverMatches(queueId);
                await new Promise(resolve => setTimeout(resolve, discoverMatchesInterval * 1000));
            }
        })();
    }
}
