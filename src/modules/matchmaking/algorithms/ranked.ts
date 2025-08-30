import type { QueueConfig } from "types/queues.js";
import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";
import type { Algorithm, Services } from "./types.js";
import { packTeamsGreedy, sumUsers } from "./utils.js";

const DOUBLE_RANGE_REQUIRED = true; // Set this to false to disable double range requirement: both party's range has to be within each other

async function expandSearchRange(
  queueData: QueueConfig & { queueType: "ranked" },
  originalParty: WithId<QueueDocument>,
  services: Services
) {
  const { incrementRange, incrementRangeMax } = queueData;

  const rankedValue = originalParty.rankedValue;
  let rankedMin = originalParty.rankedMin ?? rankedValue;
  let rankedMax = originalParty.rankedMax ?? rankedValue;

  const originalRankedMin = rankedMin;
  const originalRankedMax = rankedMax;

  // Not enough players, expand ranked range
  rankedMin -= incrementRange[0];
  rankedMax += incrementRange[1];

  // Check for differences between min and max
  const maxDifferences = rankedMax - rankedValue;
  const minDifferences = rankedValue - rankedMin;

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

  // Persist in database via service
  if (services.updatePartyRange) {
    await services.updatePartyRange(originalParty._id, rankedMin, rankedMax);
  }

  // Update the originalParty object in memory
  originalParty.rankedMin = rankedMin;
  originalParty.rankedMax = rankedMax;
  return true;
}

export const findRankedMatch: Algorithm<QueueConfig & { queueType: "ranked" }> = async (queueData, services) => {
  const { queueId, usersPerTeam, teamsPerMatch, searchRange } = queueData;

  let allParties = await services.getOldestParties(queueId, 2500);

  if (!allParties || allParties.length === 0) return;

  // Filter out parties with invalid rankedValue
  allParties = allParties.filter((party) => party.rankedValue !== null && party.rankedValue !== undefined);

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
      const partiesInRange = allParties.filter((party) => {
        if (usedPartyIds.has(party._id)) return false;
        const partyRankedValue = party.rankedValue;
        if (partyRankedValue < rankedMin || partyRankedValue > rankedMax) return false;

        if (DOUBLE_RANGE_REQUIRED) {
          // Need to check if originalParty's rankedValue is within the other party's range
          let partyRankedMin = party.rankedMin ?? partyRankedValue - searchRange[0];
          let partyRankedMax = party.rankedMax ?? partyRankedValue + searchRange[1];
          if (originalParty.rankedValue < partyRankedMin || originalParty.rankedValue > partyRankedMax) return false;
        }

        return true;
      });

      // Calculate total number of players
      const totalPlayers = sumUsers(partiesInRange);

      // If enough players to form a match
      if (totalPlayers >= usersPerTeam * teamsPerMatch) {
        const packed = packTeamsGreedy(partiesInRange, teamsPerMatch, usersPerTeam);
        if (packed) {
          await services.createMatch(queueData, packed.teams, packed.partiesUsed);
          packed.partiesUsed.forEach((id) => usedPartyIds.add(id));
          // Remove used parties from allParties
          allParties = allParties.filter((party) => !usedPartyIds.has(party._id));
          foundMatchInThisIteration = true;
          break; // Break out to start over
        } else {
          // Not able to form teams with these parties, expand ranked range
          await expandSearchRange(queueData, originalParty, services);
        }
      } else {
        // Not enough players, expand ranked range
        await expandSearchRange(queueData, originalParty, services);
      }
    }
  }
};
