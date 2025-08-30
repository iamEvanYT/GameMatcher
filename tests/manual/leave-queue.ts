import { BASE_URL } from "../configuration";
import { randomUUID } from "node:crypto";

const partyId = prompt("Party ID:");

const body = {
  partyId
};

fetch(`${BASE_URL}/v1/leave-queue`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Error:", error));
