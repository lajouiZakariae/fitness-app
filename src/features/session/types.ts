import { Session } from "@/db/queries";

export type SessionExercise = NonNullable<Session>["exercises"][number] | null;
