import { ObjectId } from "mongodb";

export interface FoundPartyDocument {
  _id: string;
  matchId: ObjectId;
  createdAt: Date;
}
