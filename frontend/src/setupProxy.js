const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.resolve(__dirname, '..', '..', 'deployment', '.deployment-state.json');

/**
 * Reads the active environment from the deployment state file.
 * Called on every request so traffic switches take effect immediately
 * without restarting the dev server.
 */
function getActiveEnvironment() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            return state.currentEnvironment || 'blue';
        }
    } catch (err) {
        console.warn('[setupProxy] Error reading state file, defaulting to blue:', err.message);
    }
    return 'blue';
}

function getBackendPort(env) {
    return env === 'green' ? 5001 : 5000;
}

module.exports = function (app) {
    // Dynamic proxy for /api requests
    app.use(
        '/api',
        function (req, res, next) {
            const activeEnv = getActiveEnvironment();
            const port = getBackendPort(activeEnv);
            const target = `http://localhost:${port}`;

            // Log the first request to show which environment is active
            if (!req._envLogged) {
                console.log(`[Proxy] /api → ${target} (${activeEnv} environment)`);
                req._envLogged = true;
            }

            const proxy = createProxyMiddleware({
                target: target,
                changeOrigin: true,
                logLevel: 'silent',
            });

            proxy(req, res, next);
        }
    );

    // Dynamic proxy for /health requests
    app.use(
        '/health',
        function (req, res, next) {
            const activeEnv = getActiveEnvironment();
            const port = getBackendPort(activeEnv);
            const target = `http://localhost:${port}`;

            const proxy = createProxyMiddleware({
                target: target,
                changeOrigin: true,
                logLevel: 'silent',
            });

            proxy(req, res, next);
        }
    );
};
