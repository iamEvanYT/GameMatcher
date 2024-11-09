import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
import type { QueueConfig } from "types/queues.js";

export async function findNormalMatch(queueData: QueueConfig & { queueType: "normal" }) {
    // Destructure queue configuration
    const {
        queueId,
        usersPerTeam,
        teamsPerMatch,
    } = queueData;

    // Fetch all parties in the queue, sorted by time added
    let allParties = await queuesCollection
        .find({ queueId })
        .sort({ timeAdded: 1 })
        .limit(2500)
        .toArray()
        .catch(emptyHandler);

    if (!allParties || allParties.length === 0) return;

    // Initialize a set to keep track of used parties
    const usedPartyIds = new Set<string>();

    // While there are enough parties to form a match
    while (allParties.length - usedPartyIds.size >= teamsPerMatch * usersPerTeam) {
        let foundMatch = false;

        // Parties that can be used for forming teams
        const partiesToConsider = allParties.filter(party => !usedPartyIds.has(party._id));

        // Calculate total number of players
        const totalPlayers = partiesToConsider.reduce((sum, party) => sum + party.userIds.length, 0);

        // If enough players
        if (totalPlayers >= usersPerTeam * teamsPerMatch) {
            // Sort parties by size (largest first)
            partiesToConsider.sort((a, b) => b.userIds.length - a.userIds.length);

            const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);

            const partiesUsed: string[] = [];

            let teamIndex = 0;

            for (const party of partiesToConsider) {
                if (usedPartyIds.has(party._id)) continue;

                // Try to add party to the current team
                if (teams[teamIndex].length + party.userIds.length <= usersPerTeam) {
                    teams[teamIndex].push(...party.userIds);
                    usedPartyIds.add(party._id);
                    partiesUsed.push(party._id);

                    // Move to next team if current team is full
                    if (teams[teamIndex].length === usersPerTeam) {
                        teamIndex = (teamIndex + 1) % teamsPerMatch;
                    }
                } else {
                    // Try next team
                    let added = false;
                    for (let i = 0; i < teamsPerMatch; i++) {
                        if (teams[i].length + party.userIds.length <= usersPerTeam) {
                            teams[i].push(...party.userIds);
                            usedPartyIds.add(party._id);
                            partiesUsed.push(party._id);
                            added = true;
                            break;
                        }
                    }
                    if (!added) continue; // Can't fit this party in any team
                }

                // Check if all teams are filled
                const allTeamsFilled = teams.every(team => team.length === usersPerTeam);

                if (allTeamsFilled) {
                    await createMatch(queueData, teams, partiesUsed);
                    foundMatch = true;
                    break;
                }
            }

            if (foundMatch) {
                // Remove used parties from allParties
                allParties = allParties.filter(party => !usedPartyIds.has(party._id));
                continue; // Start over to find more matches
            } else {
                // No match can be formed with current parties
                break;
            }
        } else {
            // Not enough players to form a match
            break;
        }
    }
}