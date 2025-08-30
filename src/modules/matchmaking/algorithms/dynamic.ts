import type { QueueConfig } from "types/queues.js";
import type { Algorithm } from "./types.js";
import { ageSeconds, packTeamsGreedy, sumUsers } from "./utils.js";

// Dynamic matchmaking:
// - Chooses an effective team size between min and max.
// - Before the elapsed threshold, uses maxUsersPerTeam to prefer fuller teams.
// - After the elapsed threshold (based on oldest party), uses minUsersPerTeam to relax requirements.
export const findDynamicMatch: Algorithm<QueueConfig & { queueType: "dynamic" }> = async (queueData, services) => {
  const { queueId, teamsPerMatch, minUsersPerTeam, maxUsersPerTeam, timeElaspedToUseMinimumUsers } = queueData;

  let allParties = await services.getOldestParties(queueId, 2500);
  if (!allParties || allParties.length === 0) return;

  // Determine effective team size based on oldest party wait time
  const now = services.now();
  const oldest = allParties[0];
  const elapsedSec = ageSeconds(oldest.timeAdded, now);
  const effectiveUsersPerTeam = elapsedSec >= timeElaspedToUseMinimumUsers ? minUsersPerTeam : maxUsersPerTeam;

  // Track used parties so we can form multiple matches per invocation
  const usedPartyIds = new Set<string>();

  let foundMatchInThisIteration = true;
  while (foundMatchInThisIteration) {
    foundMatchInThisIteration = false;

    const availableParties = allParties.filter((p) => !usedPartyIds.has(p._id));
    if (availableParties.length === 0) break;

    const totalPlayers = sumUsers(availableParties);
    const requiredPlayers = effectiveUsersPerTeam * teamsPerMatch;
    if (totalPlayers < requiredPlayers) break;
    const packed = packTeamsGreedy(availableParties, teamsPerMatch, effectiveUsersPerTeam);
    if (packed) {
      await services.createMatch(queueData, packed.teams, packed.partiesUsed);
      packed.partiesUsed.forEach((id) => usedPartyIds.add(id));
      allParties = allParties.filter((p) => !usedPartyIds.has(p._id));
      foundMatchInThisIteration = true;
    } else {
      break;
    }
  }
};
