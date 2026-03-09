import { getServerSession } from "next-auth";
import {
  getAppUserById,
  getOrCreateUsageQuota,
  getUserSubscription,
  incrementUsageQuota,
} from "@/lib/db/repositories";
import type { DifficultyLevel } from "@/lib/engine/types";
import { nextAuthOptions } from "@/lib/auth/next-auth-options";

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
  const hasAuth =
    typeof process.env.NEXTAUTH_SECRET === "string" &&
    process.env.NEXTAUTH_SECRET.length > 0;

  if (!hasAuth) {
    return {
      authConfigured: false,
      isAuthenticated: false,
      userId: null,
      plan: "free",
      monthlyCourseCount: 0,
    };
  }

  const session = await getServerSession(nextAuthOptions);
  const appUserId = session?.user?.id ?? null;

  if (!appUserId) {
    return {
      authConfigured: true,
      isAuthenticated: false,
      userId: null,
      plan: "free",
      monthlyCourseCount: 0,
    };
  }

  const appUser = await getAppUserById(appUserId);
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

export function canGenerateWithPlan(
  plan: "free" | "pro" | "team",
  difficulty: DifficultyLevel,
) {
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
