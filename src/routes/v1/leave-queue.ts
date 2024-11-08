import { Hono } from "hono";
import { type ContextWithParsedBody, parseJSONBody } from "middlewares/body-parser.js";
import { authMiddleware } from "modules/authorization.js";
import { queuesCollection } from "modules/database.js";
import { getPartyMatch } from "modules/matchmaking.js";
import { LeaveQueueSchema } from "schemas/leaveQueue.js";

const routes = new Hono();

routes.post("/", authMiddleware, parseJSONBody({ schema: LeaveQueueSchema }), async (c: ContextWithParsedBody<typeof LeaveQueueSchema>) => {
	const {
		partyId
	} = c.bodyData;

	const foundMatch = await getPartyMatch(partyId)
	if (foundMatch) {
		return c.json({
			success: true,
			status: "FoundMatch",
			matchData: foundMatch
		})
	}

	return await queuesCollection.deleteOne({
		_id: partyId
	}).then(() => {
		// success even if not found in queue so we can return a success status
		return c.json({
			success: true,
			status: "RemovedFromQueue"
		})
	}).catch(() => {
		return c.json({
			success: false
		})
	})
});

export { routes };