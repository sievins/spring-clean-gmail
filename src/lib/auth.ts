import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: "RefreshTokenError";
  }
}

interface ExtendedJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: "RefreshTokenError";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://mail.google.com/",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }): Promise<ExtendedJWT> {
      // Initial sign in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      const extendedToken = token as ExtendedJWT;

      // Return token if not expired
      if (extendedToken.expiresAt && Date.now() < extendedToken.expiresAt * 1000) {
        return extendedToken;
      }

      // Token expired, try to refresh
      if (!extendedToken.refreshToken) {
        return { ...extendedToken, error: "RefreshTokenError" as const };
      }

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: extendedToken.refreshToken,
          }),
        });

        const tokens = await response.json();

        if (!response.ok) {
          throw new Error("Failed to refresh token");
        }

        return {
          ...extendedToken,
          accessToken: tokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
          refreshToken: tokens.refresh_token ?? extendedToken.refreshToken,
        };
      } catch {
        return { ...extendedToken, error: "RefreshTokenError" as const };
      }
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT;
      session.accessToken = extendedToken.accessToken;
      session.error = extendedToken.error;
      return session;
    },
  },
});
