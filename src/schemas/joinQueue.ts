import { z } from "zod";
import { ValidQueueIdSchema } from "./validQueues.js";

export const JoinQueueSchema = z.object({
    partyId: z.string().min(1),
    userIds: z.array(z.number()).min(1),
    queueId: ValidQueueIdSchema,
    rankedValue: z.number().nullable().optional(),
    serverAccessToken: z.string().nullable().optional(),
})