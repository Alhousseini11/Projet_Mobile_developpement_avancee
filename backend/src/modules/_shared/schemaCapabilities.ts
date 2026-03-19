import { prisma } from '../../data/prisma/client';

const schemaCapabilityCache = new Map<string, Promise<boolean>>();

async function tableHasColumns(tableName: string, requiredColumns: string[]) {
  const sortedColumns = [...requiredColumns].sort();
  const cacheKey = `${tableName}:${sortedColumns.join(',')}`;
  const cached = schemaCapabilityCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const probe = (async () => {
    try {
      const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT "column_name"
        FROM "information_schema"."columns"
        WHERE "table_schema" = 'public'
          AND "table_name" = ${tableName}
      `;

      const columns = new Set(rows.map(row => row.column_name));
      return sortedColumns.every(column => columns.has(column));
    } catch {
      return false;
    }
  })();

  schemaCapabilityCache.set(cacheKey, probe);
  return probe;
}

export function isCurrentVehicleSchemaAvailable() {
  return tableHasColumns('Vehicle', [
    'name',
    'type',
    'licensePlate',
    'fuelType',
    'vin',
    'color',
    'createdAt',
    'updatedAt'
  ]);
}

export function isCurrentTutorialSchemaAvailable() {
  return tableHasColumns('Tutorial', [
    'description',
    'duration',
    'views',
    'rating',
    'instructions',
    'tools',
    'updatedAt'
  ]);
}
