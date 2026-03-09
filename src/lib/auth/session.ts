import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import {
  getAppUserByClerkId,
  getOrCreateUsageQuota,
  getUserSubscription,
  incrementUsageQuota,
  upsertAppUser,
} from "@/lib/db/repositories";
import { isClerkConfigured } from "@/lib/env";
import type { DifficultyLevel } from "@/lib/engine/types";

const REFERRAL_COOKIE = "referral_ref";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuthContext {
  authConfigured: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  plan: "free" | "pro" | "team";
  monthlyCourseCount: number;
}

export function getCurrentQuotaPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getAuthContext(): Promise<AuthContext> {
  if (!isClerkConfigured()) {
    return {
      authConfigured: false,
      isAuthenticated: false,
      userId: null,
      plan: "free",
      monthlyCourseCount: 0,
    };
  }

  const session = await auth();
  if (!session.userId) {
    return {
      authConfigured: true,
      isAuthenticated: false,
      userId: null,
      plan: "free",
      monthlyCourseCount: 0,
    };
  }

  const existingUser = await getAppUserByClerkId(session.userId);
  const clerkUser = existingUser ? null : await currentUser();

  let referrerId: string | null = null;
  if (!existingUser && clerkUser) {
    const cookieStore = await cookies();
    const ref = cookieStore.get(REFERRAL_COOKIE)?.value;
    if (ref && UUID_REGEX.test(ref)) {
      referrerId = ref;
    }
  }

  const appUser =
    existingUser ??
    (clerkUser
      ? await upsertAppUser({
          clerkUserId: session.userId,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? `${session.userId}@paperflow.local`,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
          avatarUrl: clerkUser.imageUrl,
          referrerId,
        })
      : null);

  if (!appUser) {
    return {
      authConfigured: true,
      isAuthenticated: false,
      userId: null,
      plan: "free",
      monthlyCourseCount: 0,
    };
  }

  const subscription = await getUserSubscription(appUser.id);
  const quota = await getOrCreateUsageQuota(appUser.id, getCurrentQuotaPeriod());

  return {
    authConfigured: true,
    isAuthenticated: true,
    userId: appUser.id,
    plan: subscription?.plan ?? "free",
    monthlyCourseCount: quota.coursesGenerated,
  };
}

export async function consumeGenerationQuota(userId: string) {
  return incrementUsageQuota(userId, getCurrentQuotaPeriod());
}

export function canGenerateWithPlan(plan: "free" | "pro" | "team", difficulty: DifficultyLevel) {
  if (plan === "free") {
    return difficulty === "explorer";
  }

  return true;
}

export function isQuotaExceeded(plan: "free" | "pro" | "team", monthlyCourseCount: number) {
  if (plan !== "free") {
    return false;
  }

  return monthlyCourseCount >= 3;
}

export function canAccessChapter(chapterIndex: number, isAuthenticated: boolean) {
  return chapterIndex < 2 || isAuthenticated;
}
