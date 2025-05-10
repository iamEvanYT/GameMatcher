# GameMatcher

A simple, matchmaking server designed with [Bun](https://bun.sh) that provides queue-based matchmaking functionality for multiplayer games.

Designed with Roblox in mind, but can be used for any game that needs a matchmaking system.

## Features

- **Clustering Support**: Automatically uses all available CPU cores for handling high traffic
- **Queue Management**: Join and leave matchmaking queues with custom parameters
- **Configurable Matchmaking**: Define match sizes, team structures, and ranking algorithms
- **MongoDB Integration**: Store and manage matchmaking state
- **API Versioning**: Current API is under v1 namespace
- **Error Handling**: Consistent error responses across the API
- **Health Monitoring**: Endpoint for service health checks

## Project Structure

```
GameMatcher/
├── src/                     # Source code
│   ├── index.ts             # Entry point and server setup
│   ├── modules/             # Core functionality modules
│   │   ├── config.ts        # Configuration settings
│   │   ├── database.ts      # MongoDB connection
│   │   ├── matchmaking/     # Matchmaking logic
│   ├── middlewares/         # Express middlewares
│   ├── routes/              # API routes
│   │   ├── v1/              # Version 1 API endpoints
│   ├── schemas/             # Data validation schemas
│   ├── types/               # TypeScript type definitions
├── tests/                   # Test files
├── Dockerfile               # Docker configuration
```

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime
- MongoDB instance

### Setup

1. Clone the repository:

```bash
git clone https://github.com/iamEvanYT/GameMatcher.git
cd GameMatcher
```

2. Install dependencies:

```bash
bun install
```

3. Configure environment variables:

Create a `.env` file in the root directory with the following variables:

```
# Required
MongoUrl=mongodb://localhost:27017
AuthKey=your_auth_key

# Optional
Port=3000                     # Default: 3000
Environment=Development       # Default: Testing
MATCHMAKING_ENABLED=true      # Enable/disable matchmaking
Instances=4                   # Number of worker instances (defaults to CPU count - 1)
```

## Running

### Development Mode

Run with automatic restart on file changes:

```bash
bun dev
```

### Production Mode

```bash
bun start
```

### Docker

Build the Docker image:

```bash
docker build -t gamematcher .
```

Run the container:

```bash
docker run -p 3000:3000 -e MongoUrl=mongodb://host.docker.internal:27017 -e AuthKey=your_auth_key gamematcher
```

## API Endpoints

### Healthcheck

```
GET /v1/healthcheck
```

Returns the health status of the service.

### Join Queue

```
POST /v1/join-queue
```

Adds a player or party to the matchmaking queue.

Request body:

```json
{
  "userId": "string",
  "queueId": "Ranked2v2",
  "partyId": "string", // Optional
  "rating": 1200 // Optional
}
```

### Leave Queue

```
POST /v1/leave-queue
```

Removes a player or party from the matchmaking queue.

Request body:

```json
{
  "userId": "string",
  "queueId": "Ranked2v2"
}
```

## Queues Configuration

Queues are configured in `src/modules/config.ts`. The default configuration includes:

```typescript
{
  queueId: "Ranked2v2",    // Unique queue identifier
  queueType: "ranked",     // Queue type (ranked, casual, etc.)
  usersPerTeam: 2,         // Number of players per team
  teamsPerMatch: 2,        // Number of teams per match
  discoverMatchesInterval: 5, // How often to check for matches (seconds)
  searchRange: [0, 0],     // Initial rating range to search
  incrementRange: [1, 1]   // How much to expand range per iteration
}
```

## License

This project is licensed under the terms found in the LICENSE file.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
