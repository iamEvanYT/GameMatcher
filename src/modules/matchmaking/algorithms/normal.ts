import type { QueueConfig } from "types/queues.js";
import type { Algorithm } from "./types.js";
import { packTeamsGreedy, sumUsers } from "./utils.js";

// Normal matchmaking: ignore ranked ranges and just form matches
// by packing parties up to usersPerTeam across teamsPerMatch teams.
export const findNormalMatch: Algorithm<QueueConfig & { queueType: "normal" }> = async (queueData, services) => {
  const { queueId, usersPerTeam, teamsPerMatch } = queueData;

  let allParties = await services.getOldestParties(queueId, 2500);
  if (!allParties || allParties.length === 0) return;

  // Track used parties across iterations so we can keep forming matches
  const usedPartyIds = new Set<string>();

  let foundMatchInThisIteration = true;
  while (foundMatchInThisIteration) {
    foundMatchInThisIteration = false;

    // Filter out already-used parties
    const availableParties = allParties.filter((p) => !usedPartyIds.has(p._id));
    if (availableParties.length === 0) break;

    // Check if we have enough players overall to attempt a match
    const totalPlayers = sumUsers(availableParties);
    const requiredPlayers = usersPerTeam * teamsPerMatch;
    if (totalPlayers < requiredPlayers) break;
    const packed = packTeamsGreedy(availableParties, teamsPerMatch, usersPerTeam);
    if (packed) {
      await services.createMatch(queueData, packed.teams, packed.partiesUsed);
      packed.partiesUsed.forEach((id) => usedPartyIds.add(id));
      // Remove used parties from local list and try to form another match
      allParties = allParties.filter((p) => !usedPartyIds.has(p._id));
      foundMatchInThisIteration = true;
    } else {
      // Could not form a complete match with current composition
      break;
    }
  }
};
