# Matchmaking Architecture

This project uses a modular architecture to organize matchmaking logic and make it easy to extend, test, and maintain.

## Algorithms

Supported queue algorithms:

- normal: Fixed team size, no ranking. Packs parties greedily to fill teams.
- dynamic: Team size adapts between min/max based on oldest party wait time.
- ranked: Uses party `rankedValue` with a search range that expands over time.

Algorithms live in `src/modules/matchmaking/algorithms/*` and implement a common interface.

## Interface and Registry

- Algorithm interface: `Algorithm<T extends QueueConfig> = (cfg: T, services: Services) => Promise<void>`
- Services provide DB access and utilities, keeping algorithm code pure and testable:
  - `getOldestParties(queueId, limit)`
  - `updatePartyRange(partyId, rankedMin, rankedMax)`
  - `createMatch(queueConfig, teams, partiesUsed)`
  - `now()` and `log()`
- A registry maps `queueType` to the corresponding algorithm.

## Sharding (Regions)

Requests can include `shardId` to restrict matching to a region. The server processes queues per-shard. Each queue has `shardTimeoutSeconds` to control expansion:

- `-1`: disables sharding (global matching only)
- `>= 0`: match within shard until the oldest party waits this many seconds; then an expanded global pass can combine parties from all shards

Indexes support both per-shard and global scans for efficient matching.

## Configuration Summary

See docs/configuration.md for complete details. Key fields:

- All queues: `queueId`, `queueType`, `usersPerTeam`, `teamsPerMatch`, `discoverMatchesInterval`, `shardTimeoutSeconds`
- Ranked: `searchRange`, `incrementRange`, `incrementRangeMax?`
- Dynamic: `minUsersPerTeam`, `maxUsersPerTeam`, `timeElaspedToUseMinimumUsers`

## API Summary

See docs/api.md for request/response formats. To target a region, set `shardId` in `POST /v1/join-queue`.
