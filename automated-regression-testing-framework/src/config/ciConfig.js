module.exports = {
    reportPath: './reports',
    environment: process.env.NODE_ENV || 'development',
    testTimeout: 30000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    apiKey: process.env.API_KEY || 'your-api-key',
    enableReporting: true,
};