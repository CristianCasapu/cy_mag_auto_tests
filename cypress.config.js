const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // projectId is specific to our Cypress Cloud setup.
  projectId: "nevn4b",
  // Global setting to disable Chrome's web security and turn off record videos of test runs.
  // This is particularly useful for testing applications that may have cross-origin requests.
  // Useful for handling cross-origin iframes or requests, common in e-commerce.
  chromeWebSecurity: false,
  video: false,
  numTestsKeptInMemory: 10,
  screenshotOnRunFailure: false,
  experimentalMemoryManagement: true,


  // Default viewport size for all tests, ensuring consistency.
  // Simulates a standard full HD desktop view.
  viewportWidth: 1920,
  viewportHeight: 1080,

  e2e: {
    // --- KEY CONFIGURATION ---
    // The base URL for the application.
    // We'll use relative paths `cy.visit()` (e.g., `cy.visit('/')`), allowing for easy navigation and portability across environments.
    baseUrl: 'https://magento.softwaretestingboard.com/',
    
    // --- TIMEOUTS ---
    defaultCommandTimeout: 10000, // 10 seconds
    pageLoadTimeout: 60000, // 60 seconds

    setupNodeEvents(on, config) {
      const filteredBrowsers = config.browsers.filter(
        (b) => b.family === 'chromium'
      );

      // IMPORTANT: Use only chromium based browsers.
      // We update the browsers list within the config object.
      config.browsers = filteredBrowsers;

      return config;
    },
  },
});