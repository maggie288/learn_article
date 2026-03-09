import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  createAppUserWithPassword,
  getAppUserByEmail,
  getPasswordHashByUserId,
  insertReferralStat,
} from "@/lib/db/repositories";
import { cookies } from "next/headers";

const REFERRAL_COOKIE = "referral_ref";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const nextAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await getAppUserByEmail(credentials.email);
        if (!user) {
          return null;
        }
        const hash = await getPasswordHashByUserId(user.id);
        if (!hash || !(await bcrypt.compare(credentials.password, hash))) {
          return null;
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function registerWithEmail(
  email: string,
  password: string,
  name?: string | null,
) {
  const existing = await getAppUserByEmail(email);
  if (existing) {
    return { error: "EMAIL_EXISTS" as const };
  }
  const cookieStore = await cookies();
  const ref = cookieStore.get(REFERRAL_COOKIE)?.value;
  const referrerId = ref && UUID_REGEX.test(ref) ? ref : null;
  const hash = await bcrypt.hash(password, 12);
  const user = await createAppUserWithPassword({
    email,
    name: name || null,
    passwordHash: hash,
    referrerId,
  });
  if (referrerId && user?.id) {
    await insertReferralStat(referrerId, user.id);
    await captureServerEvent({
      distinctId: user.id,
      event: "referral_signup",
      properties: { referrerId },
    });
  }
  return { error: null };
}
