import { prisma, disconnectPrisma } from './client';
import { listLocalMigrationNames, loadPrismaSchemaModels, type PrismaSchemaModel } from './schemaManifest';

interface MigrationRow {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

interface TableRow {
  table_name: string;
}

interface ColumnRow {
  table_name: string;
  column_name: string;
}

export interface DatabaseCompatibilitySnapshot {
  migrationsTableExists: boolean;
  appliedMigrationNames: string[];
  failedMigrationNames: string[];
  databaseOnlyMigrationNames: string[];
  tables: Map<string, Set<string>>;
}

export class DatabaseCompatibilityError extends Error {
  constructor(issues: string[]) {
    super(
      [
        'Database schema is incompatible with this backend build.',
        ...issues.map(issue => `- ${issue}`),
        'Run the committed Prisma migrations and verify the database before restarting the backend.'
      ].join('\n')
    );
    this.name = 'DatabaseCompatibilityError';
  }
}

export function collectDatabaseCompatibilityIssues(
  expectedModels: PrismaSchemaModel[],
  expectedMigrationNames: string[],
  snapshot: DatabaseCompatibilitySnapshot
) {
  const issues: string[] = [];

  if (!snapshot.migrationsTableExists) {
    issues.push(
      'missing "_prisma_migrations" table; the database was not initialized with Prisma Migrate'
    );
    return issues;
  }

  const appliedMigrationNames = new Set(snapshot.appliedMigrationNames);
  const pendingMigrationNames = expectedMigrationNames.filter(name => !appliedMigrationNames.has(name));

  if (pendingMigrationNames.length > 0) {
    issues.push(`pending Prisma migrations: ${pendingMigrationNames.join(', ')}`);
  }

  if (snapshot.failedMigrationNames.length > 0) {
    issues.push(`failed Prisma migrations in database history: ${snapshot.failedMigrationNames.join(', ')}`);
  }

  if (snapshot.databaseOnlyMigrationNames.length > 0) {
    issues.push(
      `database contains migrations absent from the deployed code: ${snapshot.databaseOnlyMigrationNames.join(', ')}`
    );
  }

  for (const model of expectedModels) {
    const actualColumns = snapshot.tables.get(model.dbName);

    if (!actualColumns) {
      issues.push(`missing table "${model.dbName}" required by Prisma model "${model.name}"`);
      continue;
    }

    const missingColumns = model.columns.filter(column => !actualColumns.has(column));
    if (missingColumns.length > 0) {
      issues.push(
        `missing columns on table "${model.dbName}" for Prisma model "${model.name}": ${missingColumns.join(', ')}`
      );
    }
  }

  return issues;
}

async function readDatabaseCompatibilitySnapshot(): Promise<DatabaseCompatibilitySnapshot> {
  const migrationsTableExistsRows = await prisma.$queryRaw<Array<{ exists: string | null }>>`
    SELECT to_regclass('public._prisma_migrations')::text AS "exists"
  `;
  const migrationsTableExists = migrationsTableExistsRows[0]?.exists !== null;

  if (!migrationsTableExists) {
    return {
      migrationsTableExists,
      appliedMigrationNames: [],
      failedMigrationNames: [],
      databaseOnlyMigrationNames: [],
      tables: new Map()
    };
  }

  const migrationRows = await prisma.$queryRaw<MigrationRow[]>`
    SELECT "migration_name", "finished_at", "rolled_back_at"
    FROM "public"."_prisma_migrations"
    ORDER BY "migration_name" ASC
  `;

  const localMigrationNames = listLocalMigrationNames();
  const localMigrationNameSet = new Set(localMigrationNames);
  const appliedMigrationNames = migrationRows
    .filter((row: MigrationRow) => row.finished_at !== null && row.rolled_back_at === null)
    .map((row: MigrationRow) => row.migration_name);
  const failedMigrationNames = migrationRows
    .filter((row: MigrationRow) => row.finished_at === null && row.rolled_back_at === null)
    .map((row: MigrationRow) => row.migration_name);
  const databaseOnlyMigrationNames = migrationRows
    .map((row: MigrationRow) => row.migration_name)
    .filter((name: string) => !localMigrationNameSet.has(name));

  const tableRows = await prisma.$queryRaw<TableRow[]>`
    SELECT "table_name"
    FROM "information_schema"."tables"
    WHERE "table_schema" = 'public'
      AND "table_type" = 'BASE TABLE'
  `;
  const columnRows = await prisma.$queryRaw<ColumnRow[]>`
    SELECT "table_name", "column_name"
    FROM "information_schema"."columns"
    WHERE "table_schema" = 'public'
  `;

  const tables = new Map<string, Set<string>>();
  for (const row of tableRows) {
    tables.set(row.table_name, new Set());
  }

  for (const row of columnRows) {
    const existingColumns = tables.get(row.table_name) ?? new Set<string>();
    existingColumns.add(row.column_name);
    tables.set(row.table_name, existingColumns);
  }

  return {
    migrationsTableExists,
    appliedMigrationNames,
    failedMigrationNames,
    databaseOnlyMigrationNames,
    tables
  };
}

export async function assertDatabaseIsReady() {
  const expectedModels = loadPrismaSchemaModels();
  const expectedMigrationNames = listLocalMigrationNames();
  const snapshot = await readDatabaseCompatibilitySnapshot();
  const issues = collectDatabaseCompatibilityIssues(expectedModels, expectedMigrationNames, snapshot);

  if (issues.length > 0) {
    throw new DatabaseCompatibilityError(issues);
  }
}

async function runDatabaseReadinessCheckFromCli() {
  try {
    await assertDatabaseIsReady();
    console.log('Prisma database readiness check passed.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
}

if (require.main === module) {
  void runDatabaseReadinessCheckFromCli();
}
