const fs = require('fs');
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '..', '.deployment-state.json');

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        }
    } catch (err) {
        console.error('Error reading state file:', err.message);
    }
    return {
        currentEnvironment: 'blue',
        nextEnvironment: 'green',
        deploymentHistory: [],
    };
}

function saveState(state) {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function switchEnv(targetEnv) {
    if (targetEnv !== 'blue' && targetEnv !== 'green') {
        console.error(`❌ Invalid environment: "${targetEnv}". Must be "blue" or "green".`);
        process.exit(1);
    }

    const state = loadState();
    const previousEnv = state.currentEnvironment;

    if (previousEnv === targetEnv) {
        console.log(`ℹ️  Already on ${targetEnv} environment. No change needed.`);
        return;
    }

    state.currentEnvironment = targetEnv;
    state.nextEnvironment = targetEnv === 'blue' ? 'green' : 'blue';
    saveState(state);

    const port = targetEnv === 'green' ? 5001 : 5000;

    console.log(`\n🔄 Traffic switched: ${previousEnv} → ${targetEnv}`);
    console.log(`   Active backend: http://localhost:${port}`);
    console.log(`   No restart needed — next API request will route to ${targetEnv}.`);
    console.log(`\n   Make sure the ${targetEnv} backend is running:`);
    console.log(`   npm run dev:${targetEnv}\n`);
}

// CLI
const targetEnv = process.argv[2];
if (!targetEnv) {
    const state = loadState();
    console.log(`\n📊 Current environment: ${state.currentEnvironment}`);
    console.log(`   Next environment: ${state.nextEnvironment}`);
    console.log(`\nUsage: node switch-env.js <blue|green>\n`);
} else {
    switchEnv(targetEnv);
}
