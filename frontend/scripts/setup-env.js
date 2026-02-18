const fs = require('fs');
const path = require('path');

const ENV_ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ENV_ROOT, '.env');
const requestedEnv = process.argv[2] || 'blue';

const candidates = [
  path.join(ENV_ROOT, `env.${requestedEnv}`),
  path.join(ENV_ROOT, `.env.${requestedEnv}`),
  path.join(ENV_ROOT, `env.${requestedEnv}.example`),
  path.join(ENV_ROOT, `.env.${requestedEnv}.example`),
];

const sourcePath = candidates.find((p) => fs.existsSync(p));

if (!sourcePath) {
  console.error(
    `Environment file not found for "${requestedEnv}". Looked for: ${candidates
      .map((p) => path.basename(p))
      .join(', ')}`
  );
  process.exit(1);
}

fs.copyFileSync(sourcePath, TARGET);
console.log(`Applied ${path.basename(sourcePath)} ➜ .env`);

