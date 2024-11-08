import { BASE_URL } from "../configuration"
import { randomUUID } from "node:crypto"

const queueId = prompt("Queue ID:")

const partyId = prompt("Party ID (Autogenerate if empty):") || randomUUID()
const userIds = prompt("User IDs (comma-separated):")?.split(",").map(Number) || []

const rankedValue = Number(prompt("Ranked Value:") || "0")

const body = {
    partyId,
    userIds,
    queueId,
    rankedValue,
}

fetch(`${BASE_URL}/v1/join-queue`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
})
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error("Error:", error))