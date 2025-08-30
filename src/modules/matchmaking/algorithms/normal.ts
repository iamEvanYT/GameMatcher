import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
import type { QueueConfig } from "types/queues.js";
import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";

// Normal matchmaking: ignore ranked ranges and just form matches
// by packing parties up to usersPerTeam across teamsPerMatch teams.
export async function findNormalMatch(queueData: QueueConfig & { queueType: "normal" }) {
    const {
        queueId,
        usersPerTeam,
        teamsPerMatch,
    } = queueData;

    let allParties: WithId<QueueDocument>[] | null = await queuesCollection
        .find({ queueId })
        .sort({ timeAdded: 1 })
        .limit(2500)
        .toArray()
        .catch(emptyHandler as any);

    if (!allParties || allParties.length === 0) return;

    // Track used parties across iterations so we can keep forming matches
    const usedPartyIds = new Set<string>();

    let foundMatchInThisIteration = true;
    while (foundMatchInThisIteration) {
        foundMatchInThisIteration = false;

        // Filter out already-used parties
        const availableParties = allParties.filter(p => !usedPartyIds.has(p._id));
        if (availableParties.length === 0) break;

        // Check if we have enough players overall to attempt a match
        const totalPlayers = availableParties.reduce((sum, party) => sum + party.userIds.length, 0);
        const requiredPlayers = usersPerTeam * teamsPerMatch;
        if (totalPlayers < requiredPlayers) break;

        // Greedy packing: largest parties first to fill teams
        availableParties.sort((a, b) => b.userIds.length - a.userIds.length);

        const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);
        const partiesUsed: string[] = [];

        for (const party of availableParties) {
            // Try to fit party into any team with enough remaining slots
            let placed = false;
            for (const team of teams) {
                if (team.length + party.userIds.length <= usersPerTeam) {
                    team.push(...party.userIds);
                    partiesUsed.push(party._id);
                    usedPartyIds.add(party._id);
                    placed = true;
                    break;
                }
            }

            // If we've filled all teams exactly, create the match
            const allTeamsFilled = teams.every(team => team.length === usersPerTeam);
            if (allTeamsFilled) {
                await createMatch(queueData, teams, partiesUsed);
                foundMatchInThisIteration = true;
                break;
            }

            // If party couldn't be placed, skip it and try next party
            if (!placed) continue;
        }

        if (foundMatchInThisIteration) {
            // Remove used parties from local list and try to form another match
            allParties = allParties.filter(p => !usedPartyIds.has(p._id));
        } else {
            // Could not form a complete match with current composition
            break;
        }
    }
}

