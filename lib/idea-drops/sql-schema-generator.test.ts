import { describe, expect, it } from "vitest";
import {
  generatePrismaSchema,
  generateSqlSchema,
  parseDataModel,
  toPascalCase,
  toPluralSnake,
  toSnakeCase,
} from "./sql-schema-generator";
import type { IdeaDrop } from "@/types/idea-drop";

const mockIdea: IdeaDrop = {
  id: "sourced-2026-09-04-test",
  slug: "test-saas",
  title: "Test SaaS Tool",
  category: "Dev Tools",
  demandScore: 92,
  tags: ["Dev Tools"],
  publishedAt: "2026-09-04",
  tier: "builder",
  problem: {
    summary: "Developers struggle with fragmented webhooks.",
    whoFeelsIt: "Full-stack engineers",
  },
  whyNow: "Webhooks are everywhere and need unified tracking.",
  evidence: [],
  buildBrief: {
    coreLoop: ["Capture webhook", "Verify signature", "Persist to DB", "Replay failed requests"],
    mvpScope: ["Next.js frontend", "PostgreSQL database", "Replay button"],
    explicitlyCut: ["Multi-region routing", "SMS alerts"],
    dataModel: [
      {
        name: "User",
        fields: "id, email, plan_tier, created_at",
      },
      {
        name: "WebhookEndpoint",
        fields: "id, userId, targetUrl, secretKey, isActive, totalEvents, createdAt",
      },
      {
        name: "WebhookEvent",
        fields: "id, webhookEndpointId, payload, responseCode, costEstimate, tagNames (array)",
      },
    ],
  },
  matchedApis: [],
  launchStack: [
    { layer: "hosting", tool: "Vercel", freeTierNote: "Hobby plan" },
    { layer: "database", tool: "Supabase", freeTierNote: "Free 500MB DB" },
  ],
  agentPrompts: {
    claudeCode: "Build the webhook replayer",
    cursorWindsurf: "Setup Supabase tables and RLS",
    v0Bolt: "Create the dashboard UI",
  },
  difficulty: {
    skillFloor: "intermediate",
    estimatedHours: 18,
    soloWeekendProject: true,
  },
  status: "published",
  featured: false,
};

describe("sql-schema-generator", () => {
  describe("string transforms", () => {
    it("converts strings to snake_case", () => {
      expect(toSnakeCase("WebhookEndpoint")).toBe("webhook_endpoint");
      expect(toSnakeCase("userId")).toBe("user_id");
      expect(toSnakeCase("APIKey")).toBe("api_key");
      expect(toSnakeCase("totalEvents")).toBe("total_events");
    });

    it("converts strings to plural snake_case", () => {
      expect(toPluralSnake("User")).toBe("users");
      expect(toPluralSnake("WebhookEndpoint")).toBe("webhook_endpoints");
      expect(toPluralSnake("Category")).toBe("categories");
      expect(toPluralSnake("CrashReport")).toBe("crash_reports");
    });

    it("converts strings to PascalCase", () => {
      expect(toPascalCase("webhook_endpoints")).toBe("WebhookEndpoints");
      expect(toPascalCase("users")).toBe("Users");
    });
  });

  describe("parseDataModel", () => {
    it("correctly parses tables, columns, and foreign keys", () => {
      const tables = parseDataModel(mockIdea);
      expect(tables).toHaveLength(3);

      const [userTable, endpointTable, eventTable] = tables;

      expect(userTable.tableName).toBe("users");
      expect(userTable.columns.some((c) => c.name === "id" && c.isPrimary)).toBe(true);
      expect(userTable.columns.some((c) => c.name === "email" && c.sqlType === "text")).toBe(true);

      expect(endpointTable.tableName).toBe("webhook_endpoints");
      const userFk = endpointTable.foreignKeys.find((fk) => fk.column === "user_id");
      expect(userFk).toBeDefined();
      expect(userFk?.targetTable).toBe("users");

      expect(endpointTable.columns.some((c) => c.name === "is_active" && c.sqlType === "boolean")).toBe(true);
      expect(endpointTable.columns.some((c) => c.name === "total_events" && c.sqlType === "integer")).toBe(true);

      expect(eventTable.tableName).toBe("webhook_events");
      const endpointFk = eventTable.foreignKeys.find((fk) => fk.column === "webhook_endpoint_id");
      expect(endpointFk).toBeDefined();
      expect(endpointFk?.targetTable).toBe("webhook_endpoints");

      expect(eventTable.columns.some((c) => c.name === "payload" && c.sqlType === "jsonb")).toBe(true);
      expect(eventTable.columns.some((c) => c.name === "cost_estimate" && c.sqlType === "numeric(12, 2)")).toBe(true);
      expect(eventTable.columns.some((c) => c.name === "tag_names" && c.sqlType === "text[]")).toBe(true);
    });
  });

  describe("generateSqlSchema", () => {
    it("generates valid DDL with extensions, tables, foreign keys, RLS, and seed data", () => {
      const sql = generateSqlSchema(mockIdea);

      expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.users");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.webhook_endpoints");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.webhook_events");

      // Foreign keys
      expect(sql).toContain("REFERENCES public.users(id) ON DELETE CASCADE");
      expect(sql).toContain("REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE");

      // Indexes
      expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id ON public.webhook_endpoints(user_id);");
      expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_endpoint_id ON public.webhook_events(webhook_endpoint_id);");
      expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);");

      // RLS
      expect(sql).toContain("ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain('CREATE POLICY "users_authenticated_user_isolation"');

      // Seed data
      expect(sql).toContain("INSERT INTO public.users");
      expect(sql).toContain("INSERT INTO public.webhook_endpoints");
      expect(sql).toContain("INSERT INTO public.webhook_events");
      expect(sql).toContain("ON CONFLICT (id) DO NOTHING;");
    });
  });

  describe("generatePrismaSchema", () => {
    it("generates valid Prisma model definitions", () => {
      const prisma = generatePrismaSchema(mockIdea);

      expect(prisma).toContain('datasource db {');
      expect(prisma).toContain('provider = "postgresql"');
      expect(prisma).toContain("model Users {");
      expect(prisma).toContain("model WebhookEndpoints {");
      expect(prisma).toContain("model WebhookEvents {");
      expect(prisma).toContain('@@map("webhook_endpoints")');
    });
  });
});
