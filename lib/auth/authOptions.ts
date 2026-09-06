import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "../db/connect";
import { User } from "../db/models/User";
import { logSecurityEvent } from "../security/logger";

const isProduction = process.env.NODE_ENV === "production";
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (isProduction && (!nextAuthSecret || nextAuthSecret.includes("replace_in_prod"))) {
  throw new Error("FATAL: NEXTAUTH_SECRET must be configured with a strong secret in production.");
}

const enableDevLogin = !isProduction && process.env.ENABLE_DEV_LOGIN !== "false";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                // Restricted scope: only access files created by this application
                scope:
                  "openid email profile https://www.googleapis.com/auth/drive.file",
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
    ...(enableDevLogin
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "Vault Access (Dev / Private)",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "owner@vault.local" },
              name: { label: "Display Name", type: "text", placeholder: "Vault Owner" },
            },
            async authorize(credentials) {
              const rawEmail = credentials?.email?.trim().toLowerCase();
              if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
                logSecurityEvent({
                  event: "AUTH_FAILURE",
                  details: { reason: "Invalid email format in credentials login", rawEmail },
                });
                return null;
              }

              const safeName = (credentials?.name?.trim() || "Vault Member").slice(0, 50);

              await connectToDatabase();
              let user = await User.findOne({ email: rawEmail });
              if (!user) {
                user = await User.create({
                  name: safeName,
                  email: rawEmail,
                  avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawEmail)}`,
                });
              }

              return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                image: user.avatar,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        await connectToDatabase();
        const email = user.email?.toLowerCase().trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          logSecurityEvent({
            event: "AUTH_FAILURE",
            details: { reason: "Invalid email in signIn callback", email },
          });
          return false;
        }

        let dbUser = await User.findOne({ email });
        if (!dbUser) {
          dbUser = await User.create({
            name: (user.name || "Vault Member").slice(0, 50),
            email,
            avatar: user.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
            googleId: account?.providerAccountId,
            googleAccessToken: account?.access_token,
            googleRefreshToken: account?.refresh_token,
            googleTokenExpiry: account?.expires_at,
          });
        } else if (account?.provider === "google") {
          if (account.access_token) dbUser.googleAccessToken = account.access_token;
          if (account.refresh_token) dbUser.googleRefreshToken = account.refresh_token;
          if (account.expires_at) dbUser.googleTokenExpiry = account.expires_at;
          if (account.providerAccountId) dbUser.googleId = account.providerAccountId;
          await dbUser.save();
        }
        user.id = dbUser._id.toString();
        return true;
      } catch (err) {
        console.error("Error in signIn callback:", err);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: isProduction ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: isProduction ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for better session hygiene)
    updateAge: 24 * 60 * 60, // rotate token every 24 hours
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: nextAuthSecret || "vault_dev_secret_key_9876543210_personal_knowledge",
};
