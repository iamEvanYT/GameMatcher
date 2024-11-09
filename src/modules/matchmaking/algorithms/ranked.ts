import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
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

    // Fetch all parties in the queue, sorted by time added
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

    // Sort parties by rankedValue
    allParties.sort((a, b) => a.rankedValue - b.rankedValue);

    // While there are enough parties to form a match
    while (allParties.length - usedPartyIds.size >= teamsPerMatch * usersPerTeam) {
        let foundMatch = false;

        // For each party
        for (const originalParty of allParties) {
            if (usedPartyIds.has(originalParty._id)) continue;

            const rankedValue = originalParty.rankedValue;
            let rankedMin = originalParty.rankedMin ?? rankedValue;
            let rankedMax = originalParty.rankedMax ?? rankedValue;

            // Find parties within the ranked value range
            const partiesInRange = allParties.filter(party => {
                if (usedPartyIds.has(party._id)) return false;
                const partyRankedValue = party.rankedValue;
                return partyRankedValue >= rankedMin - searchRange[0] && partyRankedValue <= rankedMax + searchRange[1];
            });

            // Calculate total number of players
            const totalPlayers = partiesInRange.reduce((sum, party) => sum + party.userIds.length, 0);

            // If enough players
            if (totalPlayers >= usersPerTeam * teamsPerMatch) {
                // Sort parties by size (largest first)
                partiesInRange.sort((a, b) => b.userIds.length - a.userIds.length);

                const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);

                const partiesUsed: string[] = [];

                let teamIndex = 0;

                for (const party of partiesInRange) {
                    if (usedPartyIds.has(party._id)) continue;

                    // Try to add party to the current team
                    if (teams[teamIndex].length + party.userIds.length <= usersPerTeam) {
                        teams[teamIndex].push(...party.userIds);
                        usedPartyIds.add(party._id);
                        partiesUsed.push(party._id);
                    } else {
                        // Move to next team
                        teamIndex = (teamIndex + 1) % teamsPerMatch;

                        // Try again to add the party
                        if (teams[teamIndex].length + party.userIds.length <= usersPerTeam) {
                            teams[teamIndex].push(...party.userIds);
                            usedPartyIds.add(party._id);
                            partiesUsed.push(party._id);
                        } else {
                            // Can't fit this party, continue to next party
                            continue;
                        }
                    }

                    // Check if all teams are filled
                    const allTeamsFilled = teams.every(team => team.length === usersPerTeam);

                    if (allTeamsFilled) {
                        createMatch(queueData, teams, partiesUsed);
                        foundMatch = true;
                        break;
                    }
                }

                if (foundMatch) {
                    // Remove used parties from allParties
                    allParties = allParties.filter(party => !usedPartyIds.has(party._id));
                    break; // Break out of the for-loop to start over
                } else {
                    // Not able to form teams with these parties, expand ranked range
                    rankedMin -= incrementRange[0];
                    rankedMax += incrementRange[1];

                    // Update in database
                    queuesCollection.updateOne(
                        { _id: originalParty._id },
                        { $set: { rankedMin, rankedMax } }
                    ).catch(emptyHandler);
                }
            } else {
                // Not enough players, expand ranked range
                rankedMin -= incrementRange[0];
                rankedMax += incrementRange[1];

                // Update in database
                queuesCollection.updateOne(
                    { _id: originalParty._id },
                    { $set: { rankedMin, rankedMax } }
                ).catch(emptyHandler);
            }
        }

        if (!foundMatch) {
            // No more matches can be formed
            break;
        }
    }
}