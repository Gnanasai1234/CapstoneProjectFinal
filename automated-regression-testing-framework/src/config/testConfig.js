module.exports = {
    baseUrl: 'http://localhost:3000', // Base URL for the application under test
    timeout: 30000, // Default timeout for tests in milliseconds
    retries: 2, // Number of retries for failed tests
    testEnvironment: 'node', // Test environment
    reportPath: './reports', // Path to save test reports
    logLevel: 'info', // Log level for test execution
};