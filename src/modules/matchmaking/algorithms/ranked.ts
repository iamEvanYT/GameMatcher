import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
import type { QueueConfig } from "types/queues.js";
import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";

async function expandSearchRange(queueData: QueueConfig & { queueType: "ranked" }, originalParty: WithId<QueueDocument>) {
    const {
        incrementRange,
        incrementRangeMax
    } = queueData;

    const rankedValue = originalParty.rankedValue;
    let rankedMin = originalParty.rankedMin ?? rankedValue;
    let rankedMax = originalParty.rankedMax ?? rankedValue;

    const originalRankedMin = rankedMin;
    const originalRankedMax = rankedMax;

    // Not enough players, expand ranked range
    rankedMin -= incrementRange[0];
    rankedMax += incrementRange[1];

    // Check for differences between min and max
    const maxDifferences = (rankedMax - rankedValue);
    const minDifferences = (rankedValue - rankedMin);

    // Cap the range
    if (incrementRangeMax) {
        if (minDifferences > incrementRangeMax[0]) {
            rankedMin = rankedValue - incrementRangeMax[0];
        }
        if (maxDifferences > incrementRangeMax[1]) {
            rankedMax = rankedValue + incrementRangeMax[1];
        }
    }

    if (originalRankedMin === rankedMin && originalRankedMax === rankedMax) {
        // nothing changed
        return false;
    }

    // Update in database
    queuesCollection.updateOne(
        { _id: originalParty._id },
        { $set: { rankedMin, rankedMax } }
    ).catch(emptyHandler);

    // Update the originalParty object in memory
    originalParty.rankedMin = rankedMin;
    originalParty.rankedMax = rankedMax;
    return true;
}

export async function findRankedMatch(queueData: QueueConfig & { queueType: "ranked" }) {
    const {
        queueId,
        usersPerTeam,
        teamsPerMatch,
        searchRange,
        incrementRange
    } = queueData;

    let allParties = await queuesCollection
        .find({ queueId })
        .sort({ timeAdded: 1 })
        .limit(2500)
        .toArray()
        .catch(emptyHandler);

    if (!allParties || allParties.length === 0) return;

    // Filter out parties with invalid rankedValue
    allParties = allParties.filter(party => party.rankedValue !== null && party.rankedValue !== undefined);

    // Initialize a set to keep track of used parties
    const usedPartyIds = new Set<string>();

    // Sort parties by timeAdded to prioritize older parties
    allParties.sort((a, b) => a.timeAdded.getTime() - b.timeAdded.getTime());

    let foundMatchInThisIteration = true;

    while (foundMatchInThisIteration) {
        foundMatchInThisIteration = false;

        // For each party that hasn't been used yet
        for (const originalParty of allParties) {
            if (usedPartyIds.has(originalParty._id)) continue;

            const rankedValue = originalParty.rankedValue;
            let rankedMin = originalParty.rankedMin ?? rankedValue - searchRange[0];
            let rankedMax = originalParty.rankedMax ?? rankedValue + searchRange[1];

            // Find parties within the ranked value range
            const partiesInRange = allParties.filter(party => {
                if (usedPartyIds.has(party._id)) return false;
                const partyRankedValue = party.rankedValue;
                return partyRankedValue >= rankedMin && partyRankedValue <= rankedMax;
            });

            // Calculate total number of players
            const totalPlayers = partiesInRange.reduce((sum, party) => sum + party.userIds.length, 0);

            // If enough players to form a match
            if (totalPlayers >= usersPerTeam * teamsPerMatch) {
                // Sort parties by size (largest first)
                partiesInRange.sort((a, b) => b.userIds.length - a.userIds.length);

                const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);
                const partiesUsed: string[] = [];

                // Assign parties to teams
                for (const party of partiesInRange) {
                    if (usedPartyIds.has(party._id)) continue;

                    // Try to add party to any team where it fits
                    let partyAdded = false;
                    for (const team of teams) {
                        if (team.length + party.userIds.length <= usersPerTeam) {
                            team.push(...party.userIds);
                            usedPartyIds.add(party._id);
                            partiesUsed.push(party._id);
                            partyAdded = true;
                            break; // Break the team loop once the party is added
                        }
                    }

                    if (!partyAdded) {
                        continue; // Couldn't add this party to any team
                    }

                    // Check if all teams are filled
                    const allTeamsFilled = teams.every(team => team.length === usersPerTeam);

                    if (allTeamsFilled) {
                        await createMatch(queueData, teams, partiesUsed);
                        foundMatchInThisIteration = true;
                        break; // Break out of the parties loop to start over
                    }
                }

                if (foundMatchInThisIteration) {
                    // Remove used parties from allParties
                    allParties = allParties.filter(party => !usedPartyIds.has(party._id));
                    break; // Break out of the for-loop to start over
                } else {
                    // Not able to form teams with these parties, expand ranked range
                    await expandSearchRange(queueData, originalParty);
                }
            } else {
                // Not enough players, expand ranked range
                await expandSearchRange(queueData, originalParty);
            }
        }
    }
}