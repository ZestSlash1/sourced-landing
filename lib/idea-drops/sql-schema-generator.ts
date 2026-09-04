import type { IdeaDrop } from "@/types/idea-drop";

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function toPluralSnake(entityName: string): string {
  const snake = toSnakeCase(entityName);
  if (snake.endsWith("s") || snake.endsWith("sh") || snake.endsWith("ch") || snake.endsWith("x")) {
    return `${snake}es`;
  }
  if (snake.endsWith("y") && !/[aeiou]y$/i.test(snake)) {
    return `${snake.slice(0, -1)}ies`;
  }
  return `${snake}s`;
}

export function toPascalCase(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export interface ParsedColumn {
  name: string;
  sqlType: string;
  isPrimary: boolean;
  foreignTable?: string;
  isNullable: boolean;
  defaultValue?: string;
  prismaType: string;
}

export interface ParsedTable {
  entityName: string;
  tableName: string;
  columns: ParsedColumn[];
  foreignKeys: { column: string; targetTable: string }[];
}

export function parseDataModel(idea: IdeaDrop): ParsedTable[] {
  const entities = idea.buildBrief.dataModel ?? [];

  const tableNamesByEntity = new Map<string, string>();
  for (const entity of entities) {
    tableNamesByEntity.set(entity.name.toLowerCase(), toPluralSnake(entity.name));
    tableNamesByEntity.set(toSnakeCase(entity.name), toPluralSnake(entity.name));
  }

  return entities.map((entity) => {
    const tableName = toPluralSnake(entity.name);
    const rawFields = entity.fields.split(",").map((f) => f.trim()).filter(Boolean);

    const columns: ParsedColumn[] = [];
    const foreignKeys: { column: string; targetTable: string }[] = [];

    for (const rawField of rawFields) {
      const isArray = rawField.toLowerCase().includes("(array)") || rawField.toLowerCase().includes("[]");
      const cleanField = rawField.replace(/\(.*?\)/g, "").replace(/\[\]/g, "").trim();
      const colName = toSnakeCase(cleanField);
      if (!colName) continue;

      if (colName === "id") {
        columns.push({
          name: "id",
          sqlType: "uuid",
          isPrimary: true,
          defaultValue: "gen_random_uuid()",
          isNullable: false,
          prismaType: "String @id @default(uuid())",
        });
        continue;
      }

      if (isArray) {
        const isUuidArray = colName.endsWith("_ids") || colName.endsWith("_id");
        columns.push({
          name: colName,
          sqlType: isUuidArray ? "uuid[]" : "text[]",
          isPrimary: false,
          defaultValue: "'{}'",
          isNullable: false,
          prismaType: isUuidArray ? "String[]" : "String[]",
        });
        continue;
      }

      let foreignTable: string | undefined;
      if (colName.endsWith("_id")) {
        const baseEntity = colName.slice(0, -3);
        foreignTable = tableNamesByEntity.get(baseEntity);
        if (foreignTable) {
          foreignKeys.push({ column: colName, targetTable: foreignTable });
          columns.push({
            name: colName,
            sqlType: "uuid",
            isPrimary: false,
            foreignTable,
            isNullable: false,
            prismaType: "String",
          });
          continue;
        }
      }

      const lower = colName.toLowerCase();
      if (lower.endsWith("_at") || lower.endsWith("_date") || lower === "timestamp" || lower.includes("period_")) {
        columns.push({
          name: colName,
          sqlType: "timestamptz",
          isPrimary: false,
          defaultValue: "now()",
          isNullable: false,
          prismaType: "DateTime @default(now())",
        });
      } else if (
        lower.startsWith("is_") ||
        lower.startsWith("has_") ||
        lower.startsWith("can_") ||
        lower === "enabled" ||
        lower === "active" ||
        lower === "completed" ||
        lower === "published"
      ) {
        columns.push({
          name: colName,
          sqlType: "boolean",
          isPrimary: false,
          defaultValue: "false",
          isNullable: false,
          prismaType: "Boolean @default(false)",
        });
      } else if (
        lower.includes("cost") ||
        lower.includes("price") ||
        lower.includes("amount") ||
        lower.includes("fee") ||
        lower.includes("balance") ||
        lower.includes("rate")
      ) {
        columns.push({
          name: colName,
          sqlType: "numeric(12, 2)",
          isPrimary: false,
          defaultValue: "0.00",
          isNullable: false,
          prismaType: "Decimal @default(0.00)",
        });
      } else if (
        lower.includes("count") ||
        lower.includes("score") ||
        lower.includes("total") ||
        lower.includes("limit") ||
        lower.includes("tokens") ||
        lower.includes("order") ||
        lower.includes("priority") ||
        lower.includes("severity")
      ) {
        columns.push({
          name: colName,
          sqlType: "integer",
          isPrimary: false,
          defaultValue: "0",
          isNullable: false,
          prismaType: "Int @default(0)",
        });
      } else if (
        lower.includes("payload") ||
        lower.includes("metadata") ||
        lower.includes("settings") ||
        lower.includes("config") ||
        lower.includes("details") ||
        lower.includes("parameters") ||
        lower.includes("bounds")
      ) {
        columns.push({
          name: colName,
          sqlType: "jsonb",
          isPrimary: false,
          defaultValue: "'{}'::jsonb",
          isNullable: false,
          prismaType: "Json @default(\"{}\")",
        });
      } else {
        columns.push({
          name: colName,
          sqlType: "text",
          isPrimary: false,
          isNullable: false,
          prismaType: "String",
        });
      }
    }

    if (!columns.some((c) => c.name === "id")) {
      columns.unshift({
        name: "id",
        sqlType: "uuid",
        isPrimary: true,
        defaultValue: "gen_random_uuid()",
        isNullable: false,
        prismaType: "String @id @default(uuid())",
      });
    }
    if (!columns.some((c) => c.name === "created_at")) {
      columns.push({
        name: "created_at",
        sqlType: "timestamptz",
        isPrimary: false,
        defaultValue: "now()",
        isNullable: false,
        prismaType: "DateTime @default(now())",
      });
    }
    if (!columns.some((c) => c.name === "updated_at")) {
      columns.push({
        name: "updated_at",
        sqlType: "timestamptz",
        isPrimary: false,
        defaultValue: "now()",
        isNullable: false,
        prismaType: "DateTime @updatedAt",
      });
    }

    return {
      entityName: entity.name,
      tableName,
      columns,
      foreignKeys,
    };
  });
}

function generateMockValue(col: ParsedColumn, index: number): string {
  if (col.isPrimary || col.foreignTable) {
    return `'00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}'`;
  }
  if (col.sqlType.includes("[]")) {
    return col.sqlType.includes("uuid")
      ? "ARRAY['00000000-0000-0000-0000-000000000099'::uuid]"
      : `ARRAY['sample_tag_${index + 1}']`;
  }
  if (col.sqlType === "timestamptz") {
    return "now()";
  }
  if (col.sqlType === "boolean") {
    return index % 2 === 0 ? "true" : "false";
  }
  if (col.sqlType === "numeric(12, 2)") {
    return (49.99 * (index + 1)).toFixed(2);
  }
  if (col.sqlType === "integer") {
    return String(10 * (index + 1));
  }
  if (col.sqlType === "jsonb") {
    return `'{\\"sample_key\\": \\"value_${index + 1}\\"}'::jsonb`;
  }
  if (col.name.includes("email")) return `'builder_${index + 1}@getsourced.dev'`;
  if (col.name.includes("url")) return `'https://getsourced.dev/sample_${index + 1}'`;
  if (col.name.includes("title") || col.name.includes("name")) return `'Sample ${col.name} ${index + 1}'`;
  if (col.name.includes("status")) return "'active'";
  return `'sample_${col.name}_${index + 1}'`;
}

export function generateSqlSchema(idea: IdeaDrop): string {
  const tables = parseDataModel(idea);
  const sections: string[] = [];

  sections.push(`-- =============================================================================
-- Sourced Database Schema: ${idea.title}
-- Generated for: https://www.getsourced.dev/feed/${idea.slug}
-- Target Engine: PostgreSQL 14+ / Supabase / Neon
-- =============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`);

  for (const table of tables) {
    const colDefs = table.columns.map((c) => {
      let line = `  ${c.name} ${c.sqlType}`;
      if (c.isPrimary) {
        line += " PRIMARY KEY";
      }
      if (!c.isNullable) {
        line += " NOT NULL";
      }
      if (c.defaultValue) {
        line += ` DEFAULT ${c.defaultValue}`;
      }
      if (c.foreignTable) {
        line += ` REFERENCES public.${c.foreignTable}(id) ON DELETE CASCADE`;
      }
      return line;
    });

    sections.push(`-- -----------------------------------------------------------------------------
-- Table: public.${table.tableName} (${table.entityName})
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.${table.tableName} (
${colDefs.join(",\n")}
);

-- Row Level Security (RLS)
ALTER TABLE public.${table.tableName} ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = '${table.tableName}' AND policyname = '${table.tableName}_authenticated_user_isolation'
  ) THEN
    CREATE POLICY "${table.tableName}_authenticated_user_isolation"
      ON public.${table.tableName}
      FOR ALL
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_set_${table.tableName}_updated_at ON public.${table.tableName};
CREATE TRIGGER trg_set_${table.tableName}_updated_at
  BEFORE UPDATE ON public.${table.tableName}
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
`);

    const indexStatements: string[] = [];
    for (const fk of table.foreignKeys) {
      indexStatements.push(`CREATE INDEX IF NOT EXISTS idx_${table.tableName}_${fk.column} ON public.${table.tableName}(${fk.column});`);
    }
    indexStatements.push(`CREATE INDEX IF NOT EXISTS idx_${table.tableName}_created_at ON public.${table.tableName}(created_at DESC);`);

    sections.push(`${indexStatements.join("\n")}\n`);
  }

  sections.push(`-- =============================================================================
-- Seed Data (Prototyping & Development Records)
-- =============================================================================`);

  for (const table of tables) {
    const colNames = table.columns.map((c) => c.name);
    const row1 = table.columns.map((c) => generateMockValue(c, 0)).join(", ");
    const row2 = table.columns.map((c) => generateMockValue(c, 1)).join(", ");

    sections.push(`INSERT INTO public.${table.tableName} (${colNames.join(", ")})
VALUES
  (${row1}),
  (${row2})
ON CONFLICT (id) DO NOTHING;
`);
  }

  return sections.join("\n");
}

export function generatePrismaSchema(idea: IdeaDrop): string {
  const tables = parseDataModel(idea);

  const lines: string[] = [
    "// =============================================================================",
    `// Sourced Prisma Schema: ${idea.title}`,
    `// Feed: https://www.getsourced.dev/feed/${idea.slug}`,
    "// =============================================================================",
    "",
    "datasource db {",
    "  provider = \"postgresql\"",
    "  url      = env(\"DATABASE_URL\")",
    "}",
    "",
    "generator client {",
    "  provider = \"prisma-client-js\"",
    "}",
    "",
  ];

  for (const table of tables) {
    lines.push(`model ${toPascalCase(table.tableName)} {`);
    for (const col of table.columns) {
      lines.push(`  ${col.name} ${col.prismaType}`);
    }
    lines.push(`  @@map("${table.tableName}")`);
    lines.push("}\n");
  }

  return lines.join("\n");
}
