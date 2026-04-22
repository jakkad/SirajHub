import type { Context, Next } from "hono";
import { createDb } from "../db/client";
import { resolveLabsSettings, type LabsSettings } from "./user-settings";
import type { Env } from "../types";

type Variables = { userId: string };
type LabKey = keyof LabsSettings;

export async function enforceLabEnabled(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
  lab: LabKey
) {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const labs = await resolveLabsSettings(db, userId);

  if (!labs[lab]) {
    return c.json(
      {
        error: "Feature disabled",
        code: "LAB_DISABLED",
        feature: lab,
      },
      403
    );
  }

  await next();
}
