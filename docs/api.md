# API Reference

## Basic Information

Auth

- Send header `authorization: <AuthKey>` when `Environment` ≠ `Testing`.
- Content-Type: `application/json`.

## Endpoints

### Healthcheck

```
GET /v1/healthcheck
```

Returns the health status of the service.

### Join Queue

```
POST /v1/join-queue
```

Adds a player or party to the matchmaking queue. If the party is already in the queue, it will not do anything, just return the party's queue status.

This route should be polled to check for changes in queue status.

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
