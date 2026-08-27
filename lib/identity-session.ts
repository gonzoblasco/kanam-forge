/**
 * identity-session.ts
 *
 * Local MVP: no auth. Returns a fixed local identity. `permissions.git.list`
 * returns all local projects (full access), so the `assertRepoAccess` guards
 * in the API routes keep working unchanged.
 */

import { cookies } from "next/headers";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const ADORABLE_IDENTITY_COOKIE = "adorable_identity_id";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const KANAM_FORGE_DATA_DIR =
  process.env.KANAM_FORGE_DATA_DIR ?? join(homedir(), ".kanam-forge", "projects");

const listLocalProjects = (): Array<{ id: string; name: string }> => {
  try {
    if (!existsSync(KANAM_FORGE_DATA_DIR)) return [];
    return readdirSync(KANAM_FORGE_DATA_DIR)
      .filter((id) => existsSync(join(KANAM_FORGE_DATA_DIR, id, "metadata.json")))
      .map((id) => ({ id, name: id }));
  } catch {
    return [];
  }
};

export const getOrCreateIdentitySession = async () => {
  const cookieStore = await cookies();
  let identityId = cookieStore.get(ADORABLE_IDENTITY_COOKIE)?.value;

  if (!identityId) {
    identityId = "local";
    cookieStore.set(ADORABLE_IDENTITY_COOKIE, identityId, {
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
    });
  }

  return {
    identityId,
    identity: {
      id: identityId,
      permissions: {
        git: {
          list: async (_opts?: unknown) => ({ repositories: listLocalProjects() }),
        },
        vms: {
          grant: async () => {},
        },
      },
    },
  };
};
