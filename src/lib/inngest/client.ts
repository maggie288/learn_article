import { Inngest } from "inngest";
import { serverEnv } from "@/lib/env";

export const inngest = new Inngest({
  id: "paperflow",
  eventKey: serverEnv.INNGEST_EVENT_KEY,
  signingKey: serverEnv.INNGEST_SIGNING_KEY,
});

export function isInngestConfigured() {
  return Boolean(serverEnv.INNGEST_EVENT_KEY && serverEnv.INNGEST_SIGNING_KEY);
}
