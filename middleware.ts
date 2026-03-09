import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const REFERRAL_COOKIE = "referral_ref";
const REFERRAL_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function middleware(request: NextRequest) {
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

  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const token = await getToken({
      req: request,
      secret,
    });
    const pathname = request.nextUrl.pathname;
    const isProtected =
      pathname.startsWith("/dashboard") || pathname.startsWith("/settings");
    if (isProtected && !token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
  }

  return response ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|_next/static|_next/image|[^?]*\\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
