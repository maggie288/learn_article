import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

const REFERRAL_COOKIE = "referral_ref";
const REFERRAL_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default clerkMiddleware(async (auth, request) => {
  try {
    let response: NextResponse | undefined;

    const url = request.nextUrl.clone();
    const ref = url.searchParams.get("ref");
    if (ref && UUID_REGEX.test(ref)) {
      response = NextResponse.next();
      response.cookies.set(REFERRAL_COOKIE, ref, {
        path: "/",
        maxAge: REFERRAL_MAX_AGE,
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    if (
      !process.env.CLERK_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ) {
      return response ?? NextResponse.next();
    }

    if (isProtectedRoute(request)) {
      await auth.protect();
    }

    return response ?? NextResponse.next();
  } catch (err) {
    console.error("[middleware]", err);
    return NextResponse.next();
  }
});

// 只对页面路由跑 middleware，不包含 /api（API 各自用 getAuthContext 鉴权），避免 Edge 上对 API 请求报错
export const config = {
  matcher: [
    "/((?!api|_next|_next/static|_next/image|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
