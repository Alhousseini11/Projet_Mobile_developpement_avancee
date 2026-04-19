import fs from 'node:fs';
import path from 'node:path';

export interface PrismaSchemaModel {
  name: string;
  dbName: string;
  columns: string[];
}

interface PrismaSchemaBlock {
  kind: 'model' | 'enum';
  name: string;
  lines: string[];
}

function stripComment(line: string) {
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const currentCharacter = line[index];
    const nextCharacter = line[index + 1];
    const previousCharacter = line[index - 1];

    if (currentCharacter === '"' && previousCharacter !== '\\') {
      inString = !inString;
      continue;
    }

    if (!inString && currentCharacter === '/' && nextCharacter === '/') {
      return line.slice(0, index);
    }
  }

  return line;
}

function extractMappedName(line: string, attributeName: '@map' | '@@map') {
  const pattern = new RegExp(`${attributeName}\\(\"([^\"]+)\"\\)`);
  return line.match(pattern)?.[1] ?? null;
}

function collectSchemaBlocks(schemaContents: string) {
  const blocks: PrismaSchemaBlock[] = [];
  const lines = schemaContents.split(/\r?\n/);
  let currentBlock: PrismaSchemaBlock | null = null;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();

    if (!line) {
      continue;
    }

    if (!currentBlock) {
      const blockMatch = line.match(/^(model|enum)\s+(\w+)\s*\{$/);

      if (blockMatch) {
        currentBlock = {
          kind: blockMatch[1] as 'model' | 'enum',
          name: blockMatch[2],
          lines: []
        };
      }

      continue;
    }

    if (line === '}') {
      blocks.push(currentBlock);
      currentBlock = null;
      continue;
    }

    currentBlock.lines.push(line);
  }

  return blocks;
}

export function parsePrismaSchemaModels(schemaContents: string) {
  const blocks = collectSchemaBlocks(schemaContents);
  const modelNames = new Set(blocks.filter(block => block.kind === 'model').map(block => block.name));

  return blocks
    .filter((block): block is PrismaSchemaBlock & { kind: 'model' } => block.kind === 'model')
    .map(block => {
      const model: PrismaSchemaModel = {
        name: block.name,
        dbName: block.name,
        columns: []
      };

      for (const line of block.lines) {
        if (line.startsWith('@@map(')) {
          model.dbName = extractMappedName(line, '@@map') ?? model.dbName;
          continue;
        }

        if (line.startsWith('@@')) {
          continue;
        }

        const fieldTokens = line.split(/\s+/);
        if (fieldTokens.length < 2) {
          continue;
        }

        const [fieldName, fieldType] = fieldTokens;
        const normalizedType = fieldType.replace(/[?\[\]]/g, '');

        if (modelNames.has(normalizedType) || line.includes('@ignore')) {
          continue;
        }

        model.columns.push(extractMappedName(line, '@map') ?? fieldName);
      }

      return model;
    });
}

export function loadPrismaSchemaModels(schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma')) {
  const schemaContents = fs.readFileSync(schemaPath, 'utf8');
  return parsePrismaSchemaModels(schemaContents);
}

export function listLocalMigrationNames(migrationsPath = path.resolve(process.cwd(), 'prisma', 'migrations')) {
  return fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}
