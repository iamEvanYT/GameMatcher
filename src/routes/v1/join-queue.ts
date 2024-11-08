import { Hono } from "hono";
import { type ContextWithParsedBody, parseJSONBody } from "middlewares/body-parser.js";
import { authMiddleware } from "modules/authorization.js";
import { queues } from "modules/config.js";
import { queuesCollection, serverIdsCollection } from "modules/database.js";
import { JoinQueueSchema } from "schemas/joinQueue.js";
import { emptyHandler } from "modules/empty-handler.js";
import { getPartyMatch } from "modules/matchmaking.js";

const routes = new Hono();

routes.post("/", authMiddleware, parseJSONBody({ schema: JoinQueueSchema }), async (c: ContextWithParsedBody<typeof JoinQueueSchema>) => {
	const {
		partyId,
		userIds,
		queueId,
		rankedValue,
		serverAccessToken
	} = c.bodyData;

	const queueConfig = queues.find(config => config.queueId === queueId)
	if (!queueConfig) {
		return c.json({ error: "Queue not found" }, 404);
	}

	if (userIds.length > queueConfig.usersPerTeam) {
		return c.json({ error: "Too many users for this queue" }, 400);
	}

	if (queueConfig.queueType == "ranked") {
		if (rankedValue === undefined || rankedValue == null) {
			return c.json({ error: "Ranked value is required" }, 400);
		}
	}

	const currentDate = new Date();

	if (serverAccessToken) {
		serverIdsCollection.insertOne({
			_id: serverAccessToken,
			createdAt: currentDate
		}).catch(emptyHandler);
	}

	const foundMatch = await getPartyMatch(partyId)
	if (foundMatch) {
		return c.json({
			success: true,
			status: "FoundMatch",
			matchData: foundMatch
		})
	}

	const result = await queuesCollection.findOneAndUpdate(
		{
			_id: partyId
		},
		{
			$setOnInsert: {
				timeAdded: currentDate,
			},
			$set: {
				queueId,
				userIds,
				rankedValue: rankedValue,
			}
		},
		{
			upsert: true,
			returnDocument: "after"
		}
	).then(newDoc => {
		return {
			success: true,
			status: "InQueue",
			queueData: newDoc
		}
	}).catch(() => {
		return {
			success: false
		}
	})

	return c.json(result);
});

export { routes };