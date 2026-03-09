import { PostHog } from "posthog-node";
import { isPostHogConfigured, serverEnv } from "@/lib/env";

let client: PostHog | null = null;

function getPostHogClient() {
  if (!isPostHogConfigured()) {
    return null;
  }

  if (!client) {
    client = new PostHog(serverEnv.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: serverEnv.NEXT_PUBLIC_POSTHOG_HOST!,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

export async function captureServerEvent(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }

  posthog.capture({
    distinctId: params.distinctId,
    event: params.event,
    properties: params.properties,
  });

  await posthog.flush();
}
