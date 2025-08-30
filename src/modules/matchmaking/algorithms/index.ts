import type { QueueConfig } from "types/queues.js";
import type { Algorithm } from "./types.js";
import { findNormalMatch } from "./normal.js";
import { findDynamicMatch } from "./dynamic.js";
import { findRankedMatch } from "./ranked.js";

export const algorithmRegistry: Record<QueueConfig["queueType"], Algorithm<any>> = {
  normal: findNormalMatch as Algorithm<any>,
  dynamic: findDynamicMatch as Algorithm<any>,
  ranked: findRankedMatch as Algorithm<any>
};
