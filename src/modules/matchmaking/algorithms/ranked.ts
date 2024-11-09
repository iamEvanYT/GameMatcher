import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";
import type { QueueConfig } from "types/queues.js";

export async function findRankedMatch(queueData: QueueConfig & { queueType: "ranked" }) {
    // Destructure queue configuration
    const {
        queueId,
        usersPerTeam,
        teamsPerMatch,
        searchRange,
        incrementRange
    } = queueData;

    // Find up to 100 parties in the queue, sorted by time added
    let foundParties = await queuesCollection
        .find({ queueId })
        .sort({ timeAdded: 1 })
        .limit(100)
        .toArray()
        .catch(emptyHandler);

    while (true) {
        // Get the next party from the queue
        const originalParty = foundParties.shift();
        if (!originalParty) break

        // Destructure party data
        const {
            _id,
            userIds,
            queueId,
            timeAdded,
            rankedValue
        } = originalParty;

        if (rankedValue === null || rankedValue === undefined) continue

        // Set ranked value range for the party
        const rankedMax = originalParty.rankedMax ?? rankedValue;
        const rankedMin = originalParty.rankedMin ?? rankedValue;

        let foundMatch = false

        // Find potential matching parties within the ranked value range
        const partiesInRange = (await queuesCollection.find({
            queueId,
            rankedValue: { $gte: rankedMin + searchRange[1], $lte: rankedMax - searchRange[0] },
            _id: { $ne: _id }
        })
            .sort({ timeAdded: 1 })
            .limit(teamsPerMatch * usersPerTeam)
            .toArray()
            .catch(emptyHandler))
            
        partiesInRange.push(originalParty)
            
        const sortedPartiesInRange = partiesInRange.sort((a, b) => b.userIds.length - a.userIds.length);

        // Calculate total number of players in matching parties
        const playersInQueue = sortedPartiesInRange.map((party) => {
            return party.userIds.length;
        }).reduce((playersInQueue, partyPlayers) => {
            return playersInQueue + partyPlayers;
        }, 0)

        // If there are enough players to form teams
        if (playersInQueue >= (usersPerTeam * teamsPerMatch)) {
            const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);

            const partiesUsed: string[] = [];

            let teamFilling = 0;

            // Parties to put back when filling another team
            let puttingBackParties: WithId<QueueDocument>[] = [];

            while (true) {
                if (teamFilling >= teamsPerMatch) break

                // Get the next party to add to a team
                const nextParty = sortedPartiesInRange.shift();
                if (!nextParty) break

                const team = teams[teamFilling];
                // If the party fits in the current team
                if ((team.length + nextParty.userIds.length) <= usersPerTeam) {
                    nextParty.userIds.forEach((userId) => {
                        team.push(userId)
                    })

                    partiesUsed.push(nextParty._id);

                    // If the team is full, move to the next team
                    if (team.length >= usersPerTeam) {
                        for (const party of puttingBackParties) {
                            sortedPartiesInRange.unshift(party);
                        }
                        puttingBackParties = [];

                        teamFilling++;
                    }
                } else {
                    if (nextParty !== originalParty) {
                        // Put the party back at the front of the queue
                        puttingBackParties.push(nextParty);
                    }
                }
            }

            // If all teams are filled, a match is found
            if (teamFilling >= teamsPerMatch) {
                foundMatch = true;

                // Remove used parties from the foundParties array
                foundParties = foundParties.filter((party) => !partiesUsed.includes(party._id))

                const { success: created, status: createResponse } = await createMatch(queueData, teams, partiesUsed);
                if (!created) {
                    if (createResponse == "NoServerAccessCode") {
                        break
                    }
                }
            }
        }

        // If no match is found, update the party's ranked value range
        if (!foundMatch) {
            queuesCollection.updateOne(
                {
                    _id,
                    queueId
                },
                {
                    $set: {
                        rankedMax: (rankedMax + incrementRange[1]),
                        rankedMin: (rankedMin - incrementRange[0])
                    }
                }
            ).catch(emptyHandler)
        }
    }
}