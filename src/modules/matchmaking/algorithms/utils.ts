import type { WithId } from "mongodb";
import type { QueueDocument } from "types/queueDocument.js";

export function createTeamsArray(n: number): number[][] {
  return Array.from({ length: n }, () => [] as number[]);
}

export function sumUsers(parties: WithId<QueueDocument>[]): number {
  return parties.reduce((sum, p) => sum + p.userIds.length, 0);
}

export function ageSeconds(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / 1000);
}

// Greedy packing by largest parties first.
// Returns null if exact fill not possible with given parties.
export function packTeamsGreedy(
  parties: WithId<QueueDocument>[],
  teamsPerMatch: number,
  usersPerTeam: number
): { teams: number[][]; partiesUsed: string[] } | null {
  const sorted = [...parties].sort((a, b) => b.userIds.length - a.userIds.length);
  const teams = createTeamsArray(teamsPerMatch);
  const partiesUsed: string[] = [];

  for (const party of sorted) {
    let placed = false;
    for (const team of teams) {
      if (team.length + party.userIds.length <= usersPerTeam) {
        team.push(...party.userIds);
        partiesUsed.push(party._id);
        placed = true;
        break;
      }
    }
    const allFilled = teams.every((t) => t.length === usersPerTeam);
    if (allFilled) return { teams, partiesUsed };
    if (!placed) continue;
  }

  // Not able to exactly fill all teams
  return null;
}
