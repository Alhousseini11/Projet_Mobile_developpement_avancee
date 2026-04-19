const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function parseEnvFile(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function main() {
  const [, , envFileArg, ...commandParts] = process.argv;

  if (!envFileArg || commandParts.length === 0) {
    console.error(
      'Usage: node scripts/run-with-env.js <env-file> <command...>'
    );
    process.exit(1);
  }

  const envFilePath = path.resolve(process.cwd(), envFileArg);
  const examplePath = `${envFilePath}.example`;

  if (!fs.existsSync(envFilePath)) {
    const exampleHint = fs.existsSync(examplePath)
      ? ` Copy "${path.basename(examplePath)}" to "${path.basename(envFilePath)}" first.`
      : '';
    console.error(`Missing environment file "${envFileArg}".${exampleHint}`);
    process.exit(1);
  }

  const envValues = parseEnvFile(fs.readFileSync(envFilePath, 'utf8'));
  const [command, ...args] = commandParts;

  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envValues
    },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  child.on('exit', code => {
    process.exit(code ?? 1);
  });

  child.on('error', error => {
    console.error(error);
    process.exit(1);
  });
}

main();
