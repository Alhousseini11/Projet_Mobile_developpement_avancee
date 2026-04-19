const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const sourceEntry = path.join(projectRoot, 'src', 'data', 'prisma', 'databaseReadiness.ts');
const buildEntry = path.join(projectRoot, 'dist', 'data', 'prisma', 'databaseReadiness.js');
const tsNodeBin = path.join(projectRoot, 'node_modules', 'ts-node', 'dist', 'bin.js');

function resolveCommand() {
  if (fs.existsSync(sourceEntry) && fs.existsSync(tsNodeBin)) {
    return {
      command: process.execPath,
      args: [tsNodeBin, sourceEntry]
    };
  }

  if (fs.existsSync(buildEntry)) {
    return {
      command: process.execPath,
      args: [buildEntry]
    };
  }

  throw new Error(
    [
      'Unable to locate the Prisma readiness check entrypoint.',
      `Expected one of: ${sourceEntry}`,
      `or ${buildEntry}`
    ].join('\n')
  );
}

const { command, args } = resolveCommand();
const result = spawnSync(command, args, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit'
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
