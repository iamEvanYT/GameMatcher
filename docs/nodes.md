# Running Multiple Nodes

- You can run multiple nodes of the matchmaking server to receive network requests, without `MATCHMAKING_ENABLED=true` in the environment variables.
- However, you need to always have one primary node that has `MATCHMAKING_ENABLED=true` in the environment variables which will handle creating matches and other matchmaking logic.
