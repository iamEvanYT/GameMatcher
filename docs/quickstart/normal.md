# Quickstart

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

3. Configure the app

Refer to [the configuration documentation](../configuration.md) for the app configuration details.

4. Configure environment variables:

Create a `.env` file in the root directory with the following variables:

```
# Required
MongoUrl=mongodb://localhost:27017
AuthKey=your_auth_key

# Optional
Port=3000                     # Default: 3000
Environment=Production        # Default: Production
MATCHMAKING_ENABLED=true      # Enable/disable matching (Must have one primary node with this set to true)
Instances=4                   # Number of worker instances (defaults to CPU count - 1)
```

## Running

```bash
bun run start
```
