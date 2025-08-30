import { z } from "zod";

export const LeaveQueueSchema = z.object({
  partyId: z.string().min(1)
});
