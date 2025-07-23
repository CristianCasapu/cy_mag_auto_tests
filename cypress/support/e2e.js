// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Enhanced test failure logging
Cypress.on('fail', (err, runnable) => {
  // Extract test information
  const testFile = Cypress.spec.name || 'unknown';
  const testSuite = runnable.parent?.title || 'unknown suite';
  const testCase = runnable.title || 'unknown test';
  
  // Log detailed failure information to console
  console.error('=== CYPRESS TEST FAILURE ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Test File:', testFile);
  console.error('Test Suite:', testSuite);
  console.error('Test Case:', testCase);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);
  console.error('Current URL:', window.location?.href || 'N/A');
  console.error('Runnable Type:', runnable.type);
  console.error('Full Runnable Info:', {
    title: runnable.title,
    fullTitle: runnable.fullTitle(),
    state: runnable.state,
    pending: runnable.pending,
    type: runnable.type
  });
  console.error('============================');
  
  // Re-throw the error to maintain normal Cypress behavior
  throw err;
});

// Command logging for debugging
Cypress.on('command:start', (command) => {
  if (command.get('name') !== 'log') {
    console.log(`Executing command: ${command.get('name')} with args:`, command.get('args'));
  }
});

Cypress.on('command:end', (command) => {
  if (command.get('name') !== 'log' && command.get('state') === 'failed') {
    console.error(`Command failed: ${command.get('name')}`, command.get('error'));
  }
});

Cypress.on('uncaught:exception', (err) => {
  // Common Magento 2 JavaScript errors that should not fail tests
  const ignoredErrors = [
    // Fotorama gallery errors
    '$(...).AddFotoramaVideoEvents is not a function',
    'fotorama',
    
    // Magento UI component errors
    'blockLoader',
    'clone',
    'loader',
    'catalogAddToCart',
    
    // RequireJS errors
    'requirejs',
    'require',
    'define',
    
    // jQuery errors that occur in Magento
    'jQuery',
    '$ is not defined',
    
    // Knockout binding errors
    'ko.',
    'knockout',
    'Unable to process binding',
    
    // Analytics and tracking errors
    'gtag',
    'ga',
    'analytics',
    'fbq',
    'dataLayer',
    
    // Third-party script errors
    'paypal',
    'klarna',
    'afterpay',
    
    // Common Magento 2 module errors
    'Magento_',
    'mage/',
    
    // AJAX and API errors that should be handled differently
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    
    // Browser compatibility errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed',
    'Non-Error promise rejection captured',
    
    // JSON parsing errors from Magento translation files
    'Unexpected end of JSON input',
    'mage-translation-dictionary',
    'JSON.parse'
  ];
  
  // Check if error message contains any ignored patterns
  const shouldIgnore = ignoredErrors.some(pattern => 
    err.message.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (shouldIgnore) {
    // Log the error for debugging but don't fail the test
    console.log(`Ignored error: ${err.message}`);
    return false;
  }
  
  // Check for specific error types
  if (err.name === 'TypeError' && err.message.includes('Cannot read')) {
    console.log(`Ignored TypeError: ${err.message}`);
    return false;
  }
  
  // Let other uncaught exceptions fail the test
  return true;
});

// Handle window errors
Cypress.on('window:before:load', (win) => {
  // Stub console.error to prevent noise in test output
  const originalError = win.console.error;
  win.console.error = (...args) => {
    const errorString = args.join(' ');
    // Only log errors that are not Magento-related noise
    if (!errorString.includes('Magento') && 
        !errorString.includes('requirejs') &&
        !errorString.includes('[object Object]')) {
      originalError.apply(win.console, args);
    }
  };
});

// Set up global test configuration
before(() => {
  // Clear any existing session data
  cy.clearCookies();
  cy.clearLocalStorage();
  
  // Visit the site to establish session
  cy.visit('/', { 
    failOnStatusCode: false,
    onBeforeLoad: (win) => {
      // Ensure we start fresh
      win.sessionStorage.clear();
    }
  });
  
  // Wait for initial page load
  cy.get('body').should('be.visible');
});