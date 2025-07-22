import HomePage from '../page-objects/HomePage';
import CartPage from '../page-objects/CartPage';
import CheckoutPage from '../page-objects/CheckoutPage';
import { PriceCalculator, TestDataGenerator } from '../utils/calculations';

describe('Checkout and Purchase Flow Tests', () => {
  let products;
  let users;
  let paymentCards;
  let cartScenarios;

  before(() => {
    // Load all test data
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
    // Clear session
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Set up API interceptions
    cy.intercept('POST', '**/customer/section/load/*').as('loadCustomerData');
    cy.intercept('POST', '**/checkout/cart/add/**').as('addToCart');
    cy.intercept('POST', '**/rest/*/V1/guest-carts/*/estimate-shipping-methods').as('estimateShipping');
    cy.intercept('POST', '**/rest/*/V1/guest-carts/*/shipping-information').as('saveShipping');
    cy.intercept('POST', '**/rest/*/V1/guest-carts/*/payment-information').as('placeOrder');
    cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals').as('getCartTotals');
    
    HomePage.visit();
  });

  describe('Guest Checkout - Happy Path', () => {
    it('should complete a successful guest checkout with single product', () => {
      const product = products[0];
      const shippingAddress = users.shippingAddresses[0];
      const guestEmail = TestDataGenerator.generateEmail();
      
      // Add product to cart
      cy.addProductToCart(product);
      cy.wait('@addToCart');
      
      // Go to checkout
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Fill guest email
      CheckoutPage.fillGuestEmail(guestEmail);
      
      // Fill shipping address
      CheckoutPage.fillShippingAddress(shippingAddress);
      
      // Wait for shipping methods to load
      cy.wait('@estimateShipping');
      
      // Select shipping method
      const shippingMethod = cartScenarios.shippingMethods[0];
      CheckoutPage.selectShippingMethod(shippingMethod.name);
      
      // Continue to payment
      CheckoutPage.continueToPayment();
      cy.wait('@saveShipping');
      
      // Select payment method
      CheckoutPage.selectPaymentMethod('checkmo');
      
      // Verify order totals
      const expectedSubtotal = product.price;
      const expectedShipping = shippingMethod.price;
      const expectedTax = PriceCalculator.calculateTax(expectedSubtotal, cartScenarios.taxCalculation.taxRate);
      const expectedTotal = PriceCalculator.calculateTotal(expectedSubtotal, expectedTax, expectedShipping);
      
      CheckoutPage.verifyOrderTotals(expectedSubtotal, expectedShipping, expectedTax, expectedTotal);
      
      // Place order
      CheckoutPage.placeOrder();
      cy.wait('@placeOrder', { timeout: 15000 });
      
      // Verify success
      CheckoutPage.verifyOrderSuccess();
      CheckoutPage.getOrderNumber().then((orderNumber) => {
        cy.log(`Order placed successfully: ${orderNumber}`);
        expect(orderNumber).to.match(/^\d{9}$/);
      });
    });

    it('should complete checkout with multiple products and quantities', () => {
      const productsToOrder = [
        { ...products[0], orderQty: 2 },
        { ...products[4], orderQty: 1 }
      ];
      const shippingAddress = users.shippingAddresses[1];
      const guestEmail = TestDataGenerator.generateEmail();
      
      // Add products to cart
      productsToOrder.forEach(product => {
        cy.addProductToCart({ ...product, quantity: product.orderQty });
        cy.wait('@addToCart');
      });
      
      // Calculate expected totals
      let expectedSubtotal = 0;
      productsToOrder.forEach(product => {
        expectedSubtotal += PriceCalculator.calculateSubtotal(product.price, product.orderQty);
      });
      
      // Go to checkout
      cy.goToCart();
      CartPage.getSubtotal().should('equal', expectedSubtotal);
      CartPage.proceedToCheckout();
      
      // Complete checkout
      CheckoutPage.fillGuestEmail(guestEmail);
      CheckoutPage.fillShippingAddress(shippingAddress);
      
      cy.wait('@estimateShipping');
      
      // Select express shipping
      const shippingMethod = cartScenarios.shippingMethods[1];
      CheckoutPage.selectShippingMethod(shippingMethod.name);
      
      CheckoutPage.continueToPayment();
      cy.wait('@saveShipping');
      
      // Verify final totals
      const expectedShipping = shippingMethod.price;
      const expectedTax = PriceCalculator.calculateTax(expectedSubtotal, cartScenarios.taxCalculation.taxRate);
      const expectedTotal = PriceCalculator.calculateTotal(expectedSubtotal, expectedTax, expectedShipping);
      
      CheckoutPage.verifyOrderTotals(expectedSubtotal, expectedShipping, expectedTax, expectedTotal);
      
      // Place order
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      cy.wait('@placeOrder', { timeout: 15000 });
      
      CheckoutPage.verifyOrderSuccess();
    });
  });

  describe('Registered User Checkout', () => {
    it('should complete checkout as logged-in user with saved address', () => {
      const user = users.registeredUser;
      const product = products[2];
      
      // Login first
      cy.login(user.email, user.password);
      
      // Add product to cart
      cy.addProductToCart(product);
      cy.wait('@addToCart');
      
      // Go to checkout
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Shipping address should be pre-filled for logged-in user
      // Just select shipping method
      cy.wait('@estimateShipping');
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      
      CheckoutPage.continueToPayment();
      cy.wait('@saveShipping');
      
      // Complete payment
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      cy.wait('@placeOrder', { timeout: 15000 });
      
      CheckoutPage.verifyOrderSuccess();
    });
  });

  describe('Checkout Validation and Error Handling', () => {
    it('should validate required fields in shipping address', () => {
      const product = products[0];
      
      // Add product and go to checkout
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Try to continue without filling required fields
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      
      // Clear a required field and try to continue
      cy.get('[name="firstname"]').clear();
      cy.get('#shipping-method-buttons-container .continue').click();
      
      // Verify validation error
      CheckoutPage.verifyValidationError('firstname', 'This is a required field');
    });

    it('should handle invalid email format', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Enter invalid email
      cy.get('#customer-email').type('invalid-email-format');
      cy.get('#customer-email').blur();
      
      // Verify email validation error
      cy.get('#customer-email-error').should('contain', 'valid email address');
    });

    it('should update totals when shipping method changes', () => {
      const product = products[0];
      const shippingAddress = users.shippingAddresses[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(shippingAddress);
      
      cy.wait('@estimateShipping');
      
      // Select first shipping method and note total
      const method1 = cartScenarios.shippingMethods[0];
      CheckoutPage.selectShippingMethod(method1.name);
      cy.wait('@getCartTotals');
      
      cy.get('.grand.totals .price').invoke('text').then(total1 => {
        const totalWithMethod1 = parseFloat(total1.replace(/[$,]/g, ''));
        
        // Change to more expensive shipping
        const method2 = cartScenarios.shippingMethods[1];
        CheckoutPage.selectShippingMethod(method2.name);
        cy.wait('@getCartTotals');
        
        // Verify total increased by difference in shipping cost
        cy.get('.grand.totals .price').invoke('text').then(total2 => {
          const totalWithMethod2 = parseFloat(total2.replace(/[$,]/g, ''));
          const expectedDifference = method2.price - method1.price;
          expect(totalWithMethod2 - totalWithMethod1).to.be.closeTo(expectedDifference, 0.01);
        });
      });
    });
  });

  describe('Payment Method Scenarios', () => {
    it('should handle different payment methods', () => {
      const product = products[0];
      const shippingAddress = users.shippingAddresses[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Fill shipping info
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(shippingAddress);
      cy.wait('@estimateShipping');
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      cy.wait('@saveShipping');
      
      // Verify multiple payment methods are available
      cy.get('.payment-method').should('have.length.greaterThan', 1);
      
      // Select different payment method
      cy.get('.payment-method').each(($method) => {
        const methodCode = $method.find('input[type="radio"]').attr('id');
        cy.log(`Available payment method: ${methodCode}`);
      });
    });

    it('should calculate correct tax based on shipping address', () => {
      const product = products[0];
      const nyAddress = users.shippingAddresses.find(addr => addr.stateCode === 'NY');
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Use NY address for known tax rate
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(nyAddress);
      cy.wait('@estimateShipping');
      
      // Select shipping and continue
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      cy.wait('@saveShipping');
      
      // Verify tax calculation
      const expectedTax = PriceCalculator.calculateTax(product.price, cartScenarios.taxCalculation.taxRate);
      cy.get('.totals-tax .price').invoke('text').then(text => {
        const actualTax = parseFloat(text.replace(/[$,]/g, ''));
        expect(actualTax).to.be.closeTo(expectedTax, 0.01);
      });
    });
  });

  describe('Checkout Recovery and Edge Cases', () => {
    it('should recover from checkout if user goes back to cart', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Start filling checkout
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      
      // Go back to cart
      cy.go('back');
      
      // Add another product
      const product2 = products[1];
      cy.addProductToCart(product2);
      cy.goToCart();
      
      // Proceed to checkout again
      CartPage.proceedToCheckout();
      
      // Verify both products are in order summary
      cy.get('.product-item-name').should('have.length', 2);
    });

    it('should handle checkout with maximum allowed items', () => {
      // Add many different products
      const productsToAdd = products.slice(0, 5);
      
      productsToAdd.forEach(product => {
        cy.addProductToCart(product);
        cy.wait('@addToCart');
      });
      
      cy.goToCart();
      
      // Verify all products are in cart
      productsToAdd.forEach(product => {
        cy.contains('.product-item-name', product.name).should('exist');
      });
      
      // Proceed through checkout
      CartPage.proceedToCheckout();
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      
      cy.wait('@estimateShipping');
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      cy.wait('@saveShipping');
      
      // Verify order summary shows all items
      cy.get('.product-item').should('have.length', productsToAdd.length);
      
      // Complete order
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      cy.wait('@placeOrder', { timeout: 20000 });
      
      CheckoutPage.verifyOrderSuccess();
    });
  });
});