"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const REFERRAL_COOKIE = "referral_ref";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COOKIE_MAX_AGE_DAYS = 30;

/** 联盟营销：URL 带 ref= 时写入 cookie，注册时记录 referrer_id */
export function ReferralCapture() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (!ref || !UUID_REGEX.test(ref)) return;
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${REFERRAL_COOKIE}=${ref}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }, [ref]);

  return null;
}
