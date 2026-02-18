const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const BUILD_DIR = path.join(ROOT, 'build');
const ENV_FILE = path.join(ROOT, '.env');

const copyRecursive = (source, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });
  entries.forEach((entry) => {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

const main = () => {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  copyRecursive(SRC_DIR, BUILD_DIR);
  if (fs.existsSync(ENV_FILE)) {
    fs.rmSync(ENV_FILE);
  }
  console.log('Frontend placeholder build completed. Files copied to build/ (env cleaned).');
};

main();

