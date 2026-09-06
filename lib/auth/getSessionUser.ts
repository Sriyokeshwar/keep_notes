import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  accessToken?: string;
}

/**
 * Resolves the authenticated session user strictly from the verified NextAuth session token.
 * Never falls back to arbitrary client-supplied or unauthenticated user objects.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);

  if (session?.user?.id && session?.user?.email) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || "Vault Member",
      image: session.user.image,
      accessToken: session.accessToken,
    };
  }

  return null;
}
