# Cypress E2E Test Suite for Magento Demo Store

A comprehensive, professional Cypress end-to-end test suite for the Magento Software Testing Board demo store, focusing on cart and purchase mechanisms with advanced regression testing capabilities.

## 🚀 Features

- **Comprehensive E2E Testing**: Full shopping cart and checkout flow coverage
- **API Validations**: Request/response interceptions and validations
- **Price Calculations**: Automated verification of complex pricing scenarios
- **Negative Testing**: Edge cases and error condition handling
- **Cross-browser Support**: Chrome-optimized with configurable browser options
- **Page Object Model**: Maintainable and scalable test architecture
- **Data-Driven Testing**: Fixture-based test data management
- **Advanced Reporting**: Detailed test execution logs and videos

## 📁 Project Structure

```
cypress/
├── e2e/                          # Test specification files
│   ├── cart-functionality.cy.js  # Shopping cart operations
│   ├── checkout-purchase.cy.js   # Checkout and purchase flows
│   ├── negative-scenarios.cy.js  # Error handling and edge cases
│   ├── api-validations.cy.js     # API interceptions and validations
│   └── advanced-regression.cy.js # Complex end-to-end scenarios
├── fixtures/                     # Test data
│   ├── products.json            # Product catalog data
│   ├── users.json               # User and address information
│   ├── payment-cards.json       # Payment method test data
│   └── cart-scenarios.json      # Cart calculation scenarios
├── page-objects/                 # Page Object Models
│   ├── HomePage.js              # Homepage interactions
│   ├── ProductPage.js           # Product detail page
│   ├── CartPage.js              # Shopping cart page
│   └── CheckoutPage.js          # Checkout process pages
├── support/
│   ├── commands.js              # Custom Cypress commands
│   └── e2e.js                   # Global test configuration
└── utils/
    └── calculations.js          # Price calculation utilities
```

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CristianCasapu/cy_mag_auto_tests.git
   cd cy_mag_auto_tests
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify Cypress installation:**
   ```bash
   npx cypress verify
   ```

## 🎯 Running Tests

### Interactive Mode (GUI)
```bash
npm run cy:open
```

### Headless Mode (CI/CD)
```bash
npm test                    # Run all tests
npm run cy:run:chrome      # Run in Chrome browser
npm run cy:run:headed      # Run with browser UI visible
```

### Individual Test Suites
```bash
npm run test:cart          # Cart functionality tests
npm run test:checkout      # Checkout and purchase tests
npm run test:negative      # Negative scenarios and edge cases
npm run test:api           # API validations and interceptions
npm run test:regression    # Advanced regression tests
npm run test:smoke         # Quick smoke test
```

## 📊 Test Coverage

### Cart Functionality
- ✅ Add single/multiple products to cart
- ✅ Update quantities and remove items
- ✅ Price calculations and cart totals
- ✅ Cart persistence across sessions
- ✅ Minicart functionality

### Checkout Process
- ✅ Guest checkout flow
- ✅ Registered user checkout
- ✅ Shipping address validation
- ✅ Shipping method selection
- ✅ Payment method handling
- ✅ Order placement and confirmation

### API Validations
- ✅ Add to cart API requests/responses
- ✅ Cart updates and deletions
- ✅ Shipping estimation APIs
- ✅ Order placement APIs
- ✅ Performance monitoring
- ✅ Error handling validation

### Negative Testing
- ✅ Invalid form inputs
- ✅ Authentication failures
- ✅ Out of stock scenarios
- ✅ Network interruptions
- ✅ Session expiration
- ✅ Browser compatibility issues

## 🔧 Configuration

### Browser Configuration
The test suite is optimized for Chromium-based browsers. Configuration can be modified in `cypress.config.js`:

```javascript
setupNodeEvents(on, config) {
  const filteredBrowsers = config.browsers.filter(
    (b) => b.family === 'chromium'
  );
  config.browsers = filteredBrowsers;
  return config;
}
```

### Test Data
Update fixture files in `cypress/fixtures/` to modify test data:
- `products.json`: Product catalog information
- `users.json`: User accounts and shipping addresses
- `payment-cards.json`: Payment method test data
- `cart-scenarios.json`: Cart calculation scenarios

## 🎨 Custom Commands

The test suite includes several custom Cypress commands for common operations:

```javascript
cy.addProductToCart(product)           // Add product with options
cy.goToCart()                          // Navigate to shopping cart
cy.clearCart()                         // Remove all cart items
cy.fillShippingAddress(address)        // Fill checkout form
cy.verifyCartTotals(subtotal, tax, total) // Validate calculations
cy.applyDiscountCode(code)             // Apply coupon codes
cy.verifyMinicartItem(name, quantity)  // Check minicart contents
```

## 📈 Advanced Features

### Price Calculation Utilities
```javascript
import { PriceCalculator } from '../utils/calculations';

// Calculate subtotal
const subtotal = PriceCalculator.calculateSubtotal(price, quantity);

// Calculate tax
const tax = PriceCalculator.calculateTax(subtotal, taxRate);

// Calculate discount
const discount = PriceCalculator.calculateDiscount(subtotal, discountData);
```

### API Interceptions
```javascript
// Intercept and validate API calls
cy.intercept('POST', '**/checkout/cart/add/**', (req) => {
  expect(req.body).to.include('product');
  req.continue((res) => {
    expect(res.statusCode).to.equal(200);
  });
}).as('addToCart');
```

### Data-Driven Testing
```javascript
// Load test data from fixtures
cy.fixture('products').then((products) => {
  products.forEach(product => {
    cy.addProductToCart(product);
  });
});
```

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: Cypress Tests
on: [push, pull_request]
jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: cypress-io/github-action@v2
        with:
          build: npm install
          start: npm start
          wait-on: 'http://localhost:3000'
```

### Docker Support
```dockerfile
FROM cypress/included:latest
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "test"]
```

## 📋 Test Reports

Test results include:
- ✅ Detailed execution logs
- 🎥 Video recordings of test runs
- 📸 Screenshots on failures
- 📊 Performance metrics
- 🔍 API request/response data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📝 Best Practices

- **Page Object Model**: Use page objects for maintainable selectors
- **Data-Driven Testing**: Store test data in fixture files
- **Custom Commands**: Create reusable commands for common actions
- **API Interceptions**: Validate backend communications
- **Error Handling**: Test negative scenarios and edge cases
- **Performance**: Monitor API response times and page loads

## 🐛 Troubleshooting

### Common Issues

1. **Test Failures**: Check video recordings and screenshots
2. **Timeouts**: Adjust `defaultCommandTimeout` in config
3. **Element Not Found**: Verify selectors in page objects
4. **API Failures**: Check network interceptions and responses

### Debugging
```bash
# Run with debug output
DEBUG=cypress:* npm test

# Run single test with browser open
npx cypress run --spec "cypress/e2e/cart-functionality.cy.js" --headed
```

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation
- Review test logs and recordings

---

**Built with ❤️ using Cypress for comprehensive e-commerce testing**
