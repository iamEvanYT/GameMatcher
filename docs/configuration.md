# Configuration

The GameMatcher application is configured through the `src/modules/config.ts` file. This document provides detailed information about all available configuration options, their purposes, and how to modify them.

## Environment Variables

The application loads several configuration values from environment variables:

### `AuthKey`

- **Type**: `string | undefined`
- **Purpose**: Authentication key used to secure API endpoints
- **Usage**: Set this in your environment or `.env` file: `AuthKey=your-secret-key`
- **Default**: None (must be provided for production)

### `MongoUrl`

- **Type**: `string`
- **Purpose**: MongoDB connection URL
- **Usage**: Set to your MongoDB instance URL: `MongoUrl=mongodb://localhost:27017` or `MongoUrl=mongodb+srv://username:password@cluster.mongodb.net/`
- **Default**: `mongodb://localhost:27017`

### `Port`

- **Type**: `number`
- **Purpose**: Port number the server will listen on
- **Usage**: Set to desired port: `Port=3000`
- **Default**: `3000`

### `Environment`

- **Type**: `string`
- **Purpose**: Application environment indicator
- **Usage**: Set to `Production`, `Development`, `Testing`, etc.
- **Default**: `Testing`

## Database Configuration

### Database Name

```typescript
export const dbName = "Matchmaking";
```

The database name used by the application. Currently set to `Matchmaking`.

### Collection Names

The application uses several MongoDB collections:

- **`queues`**: Stores active queue entries for matchmaking
- **`servers`**: Stores server information and availability
- **`foundMatches`**: Stores completed match results
- **`foundParties`**: Stores found party/ team groupings

## Queue Configuration

### Queue Array

```typescript
export const queues: QueueConfigs = [
  {
    queueId: "Ranked2v2",
    queueType: "ranked",
    usersPerTeam: 2,
    teamsPerMatch: 2,
    discoverMatchesInterval: 5,
    searchRange: [0, 0],
    incrementRange: [1, 1],
  },
] as const;
```

Each queue object contains:

- **`queueId`**: Unique identifier for the queue
- **`queueType`**: Type of match (e.g., "ranked", "casual")
- **`usersPerTeam`**: Number of players per team
- **`teamsPerMatch`**: Number of teams competing in each match
- **`discoverMatchesInterval`**: Interval in seconds for matchmaking discovery
- **`searchRange`**: Initial rating/skill range for matchmaking comparisons `[min, max]`
- **`incrementRange`**: How much to expand the search range over time `[min, max]`

### Valid Queue IDs

```typescript
export const validQueueIds = ["Ranked2v2"] as const;
```

Array of all currently supported and valid queue identifiers. Must match the `queueId` values in the `queues` array.

## Database Expiration Policies

These constants control how long data is retained in different collections:

### `QUEUE_EXPIRE_AFTER`

- **Value**: `(60 * 60 * 2)` seconds (2 hours)
- **Purpose**: Time before inactive queue entries are automatically removed

### `SERVER_EXPIRE_AFTER`

- **Value**: `(60 * 60 * 2)` seconds (2 hours)
- **Purpose**: Time before inactive server entries are automatically removed

### `MATCHES_EXPIRE_AFTER`

- **Value**: `(10 * 60)` seconds (10 minutes)
- **Purpose**: Time before completed match data is automatically cleaned up

## Usage Examples

### Adding a New Queue

To add a new queue type (e.g., Premium 1v1):

1. Add to the `queues` array:

```typescript
{
    queueId: "Premium1v1",
    queueType: "ranked",
    usersPerTeam: 1,
    teamsPerMatch: 2,
    discoverMatchesInterval: 3,
    searchRange: [0, 5],
    incrementRange: [2, 5],
}
```

2. Update `validQueueIds`:

```typescript
export const validQueueIds = ["Ranked2v2", "Premium1v1"] as const;
```

### Modifying Expiry Times

To change how long queues persist (e.g., to 1 hour):

```typescript
export const QUEUE_EXPIRE_AFTER = 60 * 60 * 1; // 1 hour in seconds
```

### Production Setup

For production deployment:

1. Set `AuthKey` to a secure value
2. Configure `MongoUrl` to point to your production MongoDB instance
3. Adjust `Environment` to `"Production"`
4. Fine-tune expiration times based on your traffic patterns
5. Add additional queue types as needed

## Configuration Best Practices

- **Security**: Never commit the `.env` file or `AuthKey` to version control
- **Monitoring**: Adjust `discoverMatchesInterval` based on expected load
- **Performance**: Fine-tune search ranges to balance matchmaking speed vs quality
- **Scalability**: Use appropriate expiration times to prevent database bloat
- **Maintenance**: Regularly review and update queue configurations based on player feedback

For changes to take effect, restart the application after modifying configuration values.
