import { queuesCollection } from "modules/database.js";
import { emptyHandler } from "modules/empty-handler.js";
import { createMatch } from "../matchmaking.js";
import type { QueueConfig } from "types/queues.js";
import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";

// Dynamic matchmaking:
// - Chooses an effective team size between min and max.
// - Before the elapsed threshold, uses maxUsersPerTeam to prefer fuller teams.
// - After the elapsed threshold (based on oldest party), uses minUsersPerTeam to relax requirements.
export async function findDynamicMatch(queueData: QueueConfig & { queueType: "dynamic" }) {
    const {
        queueId,
        teamsPerMatch,
        minUsersPerTeam,
        maxUsersPerTeam,
        timeElaspedToUseMinimumUsers,
    } = queueData;

    let allParties: WithId<QueueDocument>[] | null = await queuesCollection
        .find({ queueId })
        .sort({ timeAdded: 1 })
        .limit(2500)
        .toArray()
        .catch(emptyHandler as any);

    if (!allParties || allParties.length === 0) return;

    // Determine effective team size based on oldest party wait time
    const now = Date.now();
    const oldest = allParties[0];
    const elapsedSec = Math.floor((now - oldest.timeAdded.getTime()) / 1000);
    const effectiveUsersPerTeam = elapsedSec >= timeElaspedToUseMinimumUsers
        ? minUsersPerTeam
        : maxUsersPerTeam;

    // Track used parties so we can form multiple matches per invocation
    const usedPartyIds = new Set<string>();

    let foundMatchInThisIteration = true;
    while (foundMatchInThisIteration) {
        foundMatchInThisIteration = false;

        const availableParties = allParties.filter(p => !usedPartyIds.has(p._id));
        if (availableParties.length === 0) break;

        const totalPlayers = availableParties.reduce((sum, p) => sum + p.userIds.length, 0);
        const requiredPlayers = effectiveUsersPerTeam * teamsPerMatch;
        if (totalPlayers < requiredPlayers) break;

        // Greedy packing: largest parties first
        availableParties.sort((a, b) => b.userIds.length - a.userIds.length);

        const teams: number[][] = Array.from({ length: teamsPerMatch }, () => []);
        const partiesUsed: string[] = [];

        for (const party of availableParties) {
            let placed = false;
            for (const team of teams) {
                if (team.length + party.userIds.length <= effectiveUsersPerTeam) {
                    team.push(...party.userIds);
                    partiesUsed.push(party._id);
                    usedPartyIds.add(party._id);
                    placed = true;
                    break;
                }
            }

            const allTeamsFilled = teams.every(team => team.length === effectiveUsersPerTeam);
            if (allTeamsFilled) {
                await createMatch(queueData, teams, partiesUsed);
                foundMatchInThisIteration = true;
                break;
            }

            if (!placed) continue;
        }

        if (foundMatchInThisIteration) {
            allParties = allParties.filter(p => !usedPartyIds.has(p._id));
        } else {
            break;
        }
    }
}

