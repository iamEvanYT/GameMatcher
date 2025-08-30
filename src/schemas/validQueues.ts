import { validQueueIds } from "modules/config.js";
import { z } from "zod";

export const ValidQueueIdSchema = z.enum(validQueueIds);
export type ValidQueueId = z.infer<typeof ValidQueueIdSchema>;
