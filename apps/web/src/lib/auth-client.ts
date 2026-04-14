import { createAuthClient } from "better-auth/client";

/**
 * Better Auth client — uses /api/auth as the base path (default).
 * All auth calls go to the same origin, so no baseURL needed.
 */
export const authClient = createAuthClient();

export type Session = typeof authClient.$Infer.Session;
