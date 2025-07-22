import HomePage from '../page-objects/HomePage';
import ProductPage from '../page-objects/ProductPage';
import CartPage from '../page-objects/CartPage';
import CheckoutPage from '../page-objects/CheckoutPage';
import { TestDataGenerator } from '../utils/calculations';

describe('Negative Test Scenarios', () => {
  let products;
  let users;
  let paymentCards;
  let cartScenarios;

  before(() => {
    cy.fixture('products').then((data) => {
      products = data;
    });
    cy.fixture('users').then((data) => {
      users = data;
    });
    cy.fixture('payment-cards').then((data) => {
      paymentCards = data;
    });
    cy.fixture('cart-scenarios').then((data) => {
      cartScenarios = data;
    });
  });

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // API interceptions for error handling
    cy.intercept('POST', '**/customer/section/load/*').as('loadCustomerData');
    cy.intercept('POST', '**/checkout/cart/add/**').as('addToCart');
    cy.intercept('POST', '**/checkout/cart/updatePost/**').as('updateCart');
    cy.intercept('POST', '**/customer/account/loginPost/**').as('login');
    cy.intercept('POST', '**/rest/*/V1/coupons/**').as('applyCoupon');
    
    HomePage.visit();
  });

  describe('Product and Cart Negative Scenarios', () => {
    it('should handle adding invalid quantity to cart', () => {
      const product = products[0];
      
      cy.visit(product.url);
      ProductPage.verifyProductLoaded();
      
      // Try negative quantity
      ProductPage.setQuantity('-1');
      ProductPage.addToCart();
      
      // Should show error or reset to minimum
      cy.get('#qty').should('have.value', '1');
    });

    it('should handle adding zero quantity to cart', () => {
      const product = products[0];
      
      cy.visit(product.url);
      ProductPage.setQuantity('0');
      ProductPage.addToCart();
      
      // Should show error message
      cy.get('.message-error').should('be.visible');
    });

    it('should prevent adding configurable product without required options', () => {
      const configurableProduct = products.find(p => p.type === 'configurable');
      
      cy.visit(configurableProduct.url);
      
      // Try to add without selecting size or color
      ProductPage.addToCart();
      ProductPage.verifyErrorMessage('required');
      
      // Select only size, not color
      ProductPage.selectSize(configurableProduct.size);
      ProductPage.addToCart();
      ProductPage.verifyErrorMessage('required');
    });

    it('should handle invalid product URLs gracefully', () => {
      // Visit non-existent product
      cy.visit('/non-existent-product.html', { failOnStatusCode: false });
      
      // Should show 404 or redirect
      cy.url().should('not.include', '/non-existent-product.html');
      cy.get('.page-title').should('contain.any', '404', 'Not Found', 'Whoops');
    });

    it('should handle updating cart with invalid quantity', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      
      // Try to update with invalid quantities
      CartPage.updateQuantity(product.name, '999999');
      cy.wait('@updateCart');
      
      // Check for quantity limit error
      cy.get('.message-error').should('exist');
    });

    it('should handle expired session during cart operations', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      
      // Clear session cookies to simulate expiration
      cy.clearCookies();
      
      // Try to add another product
      cy.addProductToCart(products[1]);
      
      // Should still work or prompt for session refresh
      cy.get('.message').should('exist');
    });
  });

  describe('User Authentication Negative Scenarios', () => {
    it('should handle login with invalid credentials', () => {
      const invalidUser = users.invalidUsers[0];
      
      HomePage.clickSignIn();
      
      // Try invalid email format
      cy.get('#email').type(invalidUser.email);
      cy.get('#pass').type('somepassword');
      cy.get('#send2').click();
      
      // Should show validation error
      cy.get('#email-error').should('contain', 'valid email');
    });

    it('should handle login with wrong password', () => {
      HomePage.clickSignIn();
      
      cy.get('#email').type('valid.email@example.com');
      cy.get('#pass').type('wrongpassword');
      cy.get('#send2').click();
      
      cy.wait('@login');
      
      // Should show authentication error
      cy.get('.message-error').should('be.visible')
        .and('contain.any', 'Invalid login', 'incorrect', 'authentication');
    });

    it('should enforce password requirements during registration', () => {
      cy.visit('/customer/account/create/');
      
      // Fill form with weak password
      cy.get('#firstname').type('Test');
      cy.get('#lastname').type('User');
      cy.get('#email_address').type(TestDataGenerator.generateEmail());
      cy.get('#password').type('weak');
      cy.get('#password-confirmation').type('weak');
      
      // Submit
      cy.get('#form-validate button[type="submit"]').click();
      
      // Should show password strength error
      cy.get('#password-error').should('exist');
    });

    it('should handle account creation with existing email', () => {
      const existingEmail = 'existing.user@example.com';
      
      cy.visit('/customer/account/create/');
      
      cy.get('#firstname').type('Test');
      cy.get('#lastname').type('User');
      cy.get('#email_address').type(existingEmail);
      cy.get('#password').type('ValidPassword123!');
      cy.get('#password-confirmation').type('ValidPassword123!');
      
      cy.get('#form-validate button[type="submit"]').click();
      
      // Should show error about existing account
      cy.get('.message-error').should('contain.any', 'already', 'exists', 'account');
    });
  });

  describe('Checkout Negative Scenarios', () => {
    it('should prevent checkout with empty cart', () => {
      // Go directly to checkout with empty cart
      cy.visit('/checkout/', { failOnStatusCode: false });
      
      // Should redirect to cart or show empty cart message
      cy.url().should('include', '/cart');
      CartPage.verifyEmptyCart();
    });

    it('should validate shipping address fields', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Fill only email
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      
      // Try to continue without address
      cy.get('#shipping-method-buttons-container .continue').click();
      
      // Should show multiple validation errors
      cy.get('.field-error').should('have.length.greaterThan', 3);
    });

    it('should handle invalid shipping postal codes', () => {
      const product = products[0];
      const invalidAddress = {
        ...users.shippingAddresses[0],
        zip: 'INVALID'
      };
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(invalidAddress);
      
      // Should show postal code validation error
      cy.get('[name="postcode"]').parent().find('.field-error')
        .should('contain', 'valid');
    });

    it('should handle checkout interruption and recovery', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Start filling checkout
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      
      // Simulate connection issue by intercepting with error
      cy.intercept('POST', '**/rest/*/V1/guest-carts/*/estimate-shipping-methods', {
        statusCode: 500,
        body: { message: 'Internal Server Error' }
      }).as('failedShipping');
      
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      
      // Should handle error gracefully
      cy.wait('@failedShipping');
      cy.get('.message-error').should('be.visible');
    });
  });

  describe('Discount and Coupon Negative Scenarios', () => {
    it('should handle invalid discount codes', () => {
      const product = products[0];
      const invalidCode = 'INVALIDCODE123';
      
      cy.addProductToCart(product);
      cy.goToCart();
      
      CartPage.applyDiscountCode(invalidCode);
      cy.wait('@applyCoupon');
      
      // Should show error message
      cy.get('.message-error')
        .should('be.visible')
        .and('contain.any', 'not valid', 'invalid', 'incorrect');
    });

    it('should handle expired discount codes', () => {
      const product = products[0];
      const expiredCode = cartScenarios.discountCodes.find(c => c.type === 'expired');
      
      cy.addProductToCart(product);
      cy.goToCart();
      
      CartPage.applyDiscountCode(expiredCode.code);
      cy.wait('@applyCoupon');
      
      // Should show specific error
      cy.get('.message-error')
        .should('be.visible')
        .and('contain', expiredCode.expectedError);
    });

    it('should handle minimum purchase requirements for discounts', () => {
      // Add low-value product
      const cheapProduct = products.find(p => p.price < 20);
      const discountCode = cartScenarios.discountCodes.find(c => c.minPurchase > 30);
      
      cy.addProductToCart(cheapProduct);
      cy.goToCart();
      
      CartPage.applyDiscountCode(discountCode.code);
      cy.wait('@applyCoupon');
      
      // Should show minimum purchase error
      cy.get('.message-error')
        .should('contain.any', 'minimum', 'purchase', 'required');
    });
  });

  describe('Search and Navigation Negative Scenarios', () => {
    it('should handle search with no results', () => {
      const randomString = 'xyzabc123nonexistent';
      
      HomePage.searchProduct(randomString);
      
      // Should show no results message
      cy.get('.message.notice').should('contain', 'no results');
    });

    it('should handle search with special characters', () => {
      const specialChars = '<script>alert("test")</script>';
      
      HomePage.searchProduct(specialChars);
      
      // Should sanitize input and not execute script
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability detected');
      });
      
      // Should show search results or no results
      cy.get('.search.results').should('exist');
    });

    it('should handle extremely long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      
      HomePage.searchProduct(longQuery);
      
      // Should handle gracefully without breaking
      cy.get('.page-wrapper').should('be.visible');
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    it('should handle rapid add-to-cart actions', () => {
      const product = products[0];
      
      cy.visit(product.url);
      
      // Rapidly click add to cart multiple times
      for (let i = 0; i < 5; i++) {
        cy.get('#product-addtocart-button').click({ force: true });
      }
      
      // Should handle gracefully without duplicating items incorrectly
      cy.wait(2000);
      cy.goToCart();
      
      // Verify reasonable quantity
      cy.get('.input-text.qty').first().invoke('val').then(qty => {
        expect(parseInt(qty)).to.be.lessThan(10);
      });
    });

    it('should handle concurrent cart updates', () => {
      // Add multiple products
      products.slice(0, 3).forEach(product => {
        cy.addProductToCart(product);
      });
      
      cy.goToCart();
      
      // Update multiple quantities simultaneously
      cy.get('.input-text.qty').each(($input, index) => {
        cy.wrap($input).clear().type(index + 2);
      });
      
      // Update cart
      cy.get('.action.update').click();
      cy.wait('@updateCart');
      
      // Should update all items correctly
      cy.get('.message').should('not.contain', 'error');
    });
  });

  describe('Browser and Compatibility Scenarios', () => {
    it('should handle browser back button during checkout', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Fill some checkout info
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      
      // Use browser back
      cy.go('back');
      
      // Should be back at cart
      cy.url().should('include', '/cart');
      
      // Cart should still have items
      CartPage.verifyProductInCart(product.name, 1, product.price);
    });

    it('should handle page refresh during operations', () => {
      const product = products[0];
      
      cy.visit(product.url);
      ProductPage.selectSize(product.size);
      
      // Refresh page
      cy.reload();
      
      // Selection should be lost
      cy.get('.swatch-option.selected').should('not.exist');
      
      // Should need to reselect options
      ProductPage.selectSize(product.size);
      ProductPage.selectColor(product.color);
      ProductPage.addToCart();
      
      // Should work after refresh
      cy.get('.message-success').should('be.visible');
    });
  });
});