import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";
import type { QueueConfig } from "types/queues.js";

export async function findNormalMatch(queueData: QueueConfig & { queueType: "normal" }) {
    // Destructure queue configuration
    const {
        queueId,
        usersPerTeam,
        teamsPerMatch,
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
        if (!originalParty) break;

        // Destructure party data
        const {
            _id,
            userIds,
            queueId,
            timeAdded,
        } = originalParty;

        let foundMatch = false;

        // Find potential matching parties
        const potentialMatches = (await queuesCollection.find({
            queueId,
            _id: { $ne: _id }
        })
            .sort({ timeAdded: 1 })
            .limit(teamsPerMatch * usersPerTeam)
            .toArray()
            .catch(emptyHandler))
            
        potentialMatches.push(originalParty);
            
        const sortedPotentialMatches = potentialMatches.sort((a, b) => b.userIds.length - a.userIds.length);

        // Calculate total number of players in matching parties
        const playersInQueue = sortedPotentialMatches.reduce((total, party) => total + party.userIds.length, 0);

        // If there are enough players to form teams
        if (playersInQueue >= (usersPerTeam * teamsPerMatch)) {
            const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);
            const partiesUsed: string[] = [];
            let teamFilling = 0;

            // Parties to put back when filling another team
            let puttingBackParties: WithId<QueueDocument>[] = [];

            while (true) {
                if (teamFilling >= teamsPerMatch) break;

                // Get the next party to add to a team
                const nextParty = sortedPotentialMatches.shift();
                if (!nextParty) break;

                const team = teams[teamFilling];
                // If the party fits in the current team
                if ((team.length + nextParty.userIds.length) <= usersPerTeam) {
                    team.push(...nextParty.userIds);
                    partiesUsed.push(nextParty._id);

                    // If the team is full, move to the next team
                    if (team.length >= usersPerTeam) {
                        sortedPotentialMatches.unshift(...puttingBackParties);
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
                foundParties = foundParties.filter((party) => !partiesUsed.includes(party._id));

                const { success: created, status: createResponse } = await createMatch(queueData, teams, partiesUsed);
                if (!created) {
                    if (createResponse == "NoServerAccessCode") {
                        break;
                    }
                }
            }
        }

        // If no match is found, the party remains in the queue for the next iteration
        if (!foundMatch) {
            // No need to update anything for normal queues
        }
    }
}