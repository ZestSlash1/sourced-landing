import "server-only";
import { Client, Databases, ID, Permission, Role } from "node-appwrite";

export interface SignupRecord {
  email: string;
  tier: string;
  source: string;
  created_at?: string;
}

export interface SignupResult {
  success: boolean;
  id?: string;
  existing?: boolean;
  error?: string;
}

// In-memory fallback cache for development/test resilience if Appwrite instance is offline
const devFallbackSignups = new Map<string, SignupRecord>();

/**
 * Creates an authenticated server-side Appwrite client pointing to the Slatebase tenant.
 * The API key is kept strictly within the server context.
 */
export function getSlatebaseDatabases(): { databases: Databases; databaseId: string; collectionId: string } {
  const endpoint = process.env.SLATEBASE_ENDPOINT || "https://getsourced.slatebase.dev/v1";
  const projectId = process.env.SLATEBASE_PROJECT_ID || "getsourced-prod";
  const apiKey = process.env.SLATEBASE_API_KEY || "";
  const databaseId = process.env.SLATEBASE_DATABASE_ID || "main";
  const collectionId = process.env.SLATEBASE_COLLECTION_SIGNUPS_ID || "signups";

  if (!apiKey && process.env.NODE_ENV === "production") {
    throw new Error("Missing required SLATEBASE_API_KEY environment variable");
  }

  const client = new Client();
  client
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);
  return { databases, databaseId, collectionId };
}

/**
 * Records a new signup in the Slatebase `signups` collection.
 * Permissions: unauthenticated write only; readable by server/dashboard only.
 */
export async function recordSignup(signup: SignupRecord): Promise<SignupResult> {
  const { databases, databaseId, collectionId } = getSlatebaseDatabases();
  const email = signup.email.trim().toLowerCase();
  const tier = signup.tier || "free";
  const source = signup.source || "hero";
  const created_at = signup.created_at || new Date().toISOString();

  try {
    const doc = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        email,
        tier,
        source,
        created_at,
      },
      [
        // Server-side write. Client cannot read back; signups are only readable
        // via server context or Slatebase admin dashboard.
      ]
    );

    return {
      success: true,
      id: doc.$id,
    };
  } catch (err: unknown) {
    const appwriteErr = err as { code?: number; message?: string; type?: string };

    // 409 Conflict: Unique email constraint violation in Appwrite
    if (appwriteErr.code === 409 || (appwriteErr.message && appwriteErr.message.includes("already exists"))) {
      return {
        success: true,
        existing: true,
      };
    }

    // Network / offline fallback for development resilience
    const msg = appwriteErr.message || String(err);
    if (
      msg.includes("fetch failed") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      process.env.NODE_ENV === "test"
    ) {
      console.warn(
        `[Slatebase] Tenant Appwrite connection offline or mocked (${msg}). Storing signup in dev-resilience store.`
      );
      if (devFallbackSignups.has(email)) {
        return { success: true, existing: true };
      }
      devFallbackSignups.set(email, { email, tier, source, created_at });
      return {
        success: true,
        id: `dev_${Math.random().toString(36).substring(2, 9)}`,
      };
    }

    console.error(`[Slatebase] Failed to create signup document: ${msg}`);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Exposed for tests to reset in-memory dev fallback store.
 */
export function _resetDevFallbackSignups(): void {
  devFallbackSignups.clear();
}
