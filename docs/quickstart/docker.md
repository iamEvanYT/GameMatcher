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

2. Build the Docker image:

```bash
docker build -t gamematcher .
```

3. Configure the app

Refer to [the configuration documentation](../configuration.md) for the app configuration details.

## Running the container

Refer to the [normal quickstart](./normal.md) for the environment variables details.

```bash
docker run \
  -p 3000:3000 \
  -e MongoUrl=mongodb://localhost:27017 \
  -e AuthKey=your_auth_key \
  -e Port=3000 \
  -e Environment=Development \
  -e MATCHMAKING_ENABLED=true \
  -e Instances=4 \
  gamematcher
```
