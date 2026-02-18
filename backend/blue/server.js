// const path = require('path');
// const fs = require('fs');

// const envCandidates = ['.env', 'env'];
// const envPath = envCandidates
//   .map((filename) => path.join(__dirname, filename))
//   .find((candidate) => fs.existsSync(candidate));

// if (envPath) {
//   process.env.ENV_FILE = envPath;
// }

// require('../shared/server');

const path = require('path');
const fs = require('fs');

// Try to load .env file, fallback to 'env' file
const envPath = path.join(__dirname, '.env');
const envFallback = path.join(__dirname, 'env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else if (fs.existsSync(envFallback)) {
  require('dotenv').config({ path: envFallback });
}

// Load shared server
require('../shared/server');