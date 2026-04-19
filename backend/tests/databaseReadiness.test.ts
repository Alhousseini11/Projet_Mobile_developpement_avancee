import test from 'node:test';
import assert from 'node:assert/strict';
import { collectDatabaseCompatibilityIssues, type DatabaseCompatibilitySnapshot } from '../src/data/prisma/databaseReadiness';
import { parsePrismaSchemaModels } from '../src/data/prisma/schemaManifest';

test('parsePrismaSchemaModels keeps scalar columns and honors @map / @@map', () => {
  const models = parsePrismaSchemaModels(`
    enum Role {
      USER
    }

    model User {
      id    String @id
      email String @unique @map("email_address")
      role  Role
      posts Post[]

      @@map("users")
    }

    model Post {
      id     String @id
      userId String
      user   User   @relation(fields: [userId], references: [id])
    }
  `);

  assert.deepEqual(models, [
    {
      name: 'User',
      dbName: 'users',
      columns: ['id', 'email_address', 'role']
    },
    {
      name: 'Post',
      dbName: 'Post',
      columns: ['id', 'userId']
    }
  ]);
});

test('collectDatabaseCompatibilityIssues reports pending migrations and missing columns', () => {
  const snapshot: DatabaseCompatibilitySnapshot = {
    migrationsTableExists: true,
    appliedMigrationNames: ['20260224051203_init'],
    failedMigrationNames: [],
    databaseOnlyMigrationNames: [],
    tables: new Map([
      ['User', new Set(['id', 'email'])],
      ['Vehicle', new Set(['id', 'userId'])]
    ])
  };

  const issues = collectDatabaseCompatibilityIssues(
    [
      { name: 'User', dbName: 'User', columns: ['id', 'email'] },
      { name: 'Vehicle', dbName: 'Vehicle', columns: ['id', 'userId', 'name'] }
    ],
    ['20260224051203_init', '20260319170000_align_legacy_schema_with_prisma'],
    snapshot
  );

  assert.deepEqual(issues, [
    'pending Prisma migrations: 20260319170000_align_legacy_schema_with_prisma',
    'missing columns on table "Vehicle" for Prisma model "Vehicle": name'
  ]);
});

test('collectDatabaseCompatibilityIssues fails fast when Prisma migration history is absent', () => {
  const issues = collectDatabaseCompatibilityIssues(
    [{ name: 'User', dbName: 'User', columns: ['id'] }],
    ['20260224051203_init'],
    {
      migrationsTableExists: false,
      appliedMigrationNames: [],
      failedMigrationNames: [],
      databaseOnlyMigrationNames: [],
      tables: new Map()
    }
  );

  assert.deepEqual(issues, [
    'missing "_prisma_migrations" table; the database was not initialized with Prisma Migrate'
  ]);
});
