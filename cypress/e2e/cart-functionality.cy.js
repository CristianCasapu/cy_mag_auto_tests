import HomePage from '../page-objects/HomePage';
import ProductPage from '../page-objects/ProductPage';
import CartPage from '../page-objects/CartPage';
import { PriceCalculator, CartValidator } from '../utils/calculations';

describe('Shopping Cart Functionality Tests', () => {
  let products;
  let cartScenarios;

  before(() => {
    // Load test data
    cy.fixture('products').then((data) => {
      products = data;
    });
    cy.fixture('cart-scenarios').then((data) => {
      cartScenarios = data;
    });
  });

  beforeEach(() => {
    // Clear cookies and local storage
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Set up API interceptions using helper function
    cy.setupCartInterceptions();
    
    // Visit homepage
    HomePage.visit();
  });

  describe('Add to Cart Operations', () => {
    it('should add a simple product to cart', () => {
      const product = products.find(p => p.type === 'simple');
      
      cy.addProductToCart(product);
      cy.waitForAddToCart();
      
      // Verify minicart updated
      cy.verifyMinicartItem(product.name);
      
      // Verify minicart count
      HomePage.getMiniCartCount().then(count => {
        expect(count).to.equal(product.quantity || 1);
      });
      
      // Go to cart and verify
      cy.goToCart();
      CartPage.verifyProductInCart(product.name, product.quantity || 1, product.price);
    });

    it('should add a configurable product with options to cart', () => {
      const product = products.find(p => p.type === 'configurable');
      
      cy.addProductToCart(product);
      cy.waitForAddToCart();
      
      // Verify product added with correct options
      cy.goToCart();
      CartPage.verifyProductInCart(product.name, 1, product.price);
      
      // Verify options are displayed
      cy.contains('.options', product.size).should('exist');
      cy.contains('.options', product.color).should('exist');
    });

    it('should handle adding product without selecting required options', () => {
      const product = products.find(p => p.type === 'configurable');
      
      cy.visit(product.url);
      ProductPage.verifyProductLoaded();
      
      // Try to add without selecting options
      ProductPage.addToCart();
      ProductPage.verifyErrorMessage('required');
    });

    it('should add multiple different products to cart', () => {
      const product1 = products[0];
      const product2 = products[4]; // Simple product
      
      // Add first product
      cy.addProductToCart(product1);
      cy.waitForAddToCart();
      
      // Add second product
      cy.addProductToCart(product2);
      cy.waitForAddToCart();
      
      // Verify both products in cart
      cy.goToCart();
      CartPage.verifyProductInCart(product1.name, 1, product1.price);
      CartPage.verifyProductInCart(product2.name, 1, product2.price);
      
      // Verify total
      const expectedSubtotal = product1.price + product2.price;
      CartPage.getSubtotal().should('equal', expectedSubtotal);
    });
  });

  describe('Cart Calculations and Updates', () => {
    it('should correctly calculate totals when quantity is updated', () => {
      const scenario = cartScenarios.priceCalculations.multipleQuantity;
      const product = products.find(p => p.name === scenario.product);
      
      // Add product to cart
      cy.addProductToCart(product);
      cy.goToCart();
      
      // Update quantity
      CartPage.updateQuantity(product.name, scenario.quantity);
      cy.waitForCartUpdate();
      
      // Verify calculations
      const expectedSubtotal = PriceCalculator.calculateSubtotal(product.price, scenario.quantity);
      CartPage.verifyProductInCart(product.name, scenario.quantity, expectedSubtotal);
      CartPage.getSubtotal().should('equal', expectedSubtotal);
    });

    it('should correctly calculate totals with multiple products and quantities', () => {
      const multipleProducts = cartScenarios.priceCalculations.multipleProducts;
      let runningTotal = 0;
      
      // Add products with quantities
      multipleProducts.forEach((item) => {
        const product = products.find(p => p.name === item.product);
        const productWithQty = { ...product, quantity: item.quantity };
        
        cy.addProductToCart(productWithQty);
        
        runningTotal += PriceCalculator.calculateSubtotal(product.price, item.quantity);
      });
      
      // Go to cart and verify total
      cy.goToCart();
      CartPage.getSubtotal().should('equal', runningTotal);
      
      // Verify individual product subtotals
      multipleProducts.forEach(item => {
        CartPage.verifyProductInCart(item.product, item.quantity, item.price);
      });
    });

    it('should update cart total when product is removed', () => {
      // Add multiple products
      const product1 = products[0];
      const product2 = products[1];
      
      cy.addProductToCart(product1);
      cy.waitForAddToCart();
      cy.addProductToCart(product2);
      cy.waitForAddToCart();
      
      cy.goToCart();
      
      // Verify initial total
      const initialTotal = product1.price + product2.price;
      CartPage.getSubtotal().should('equal', initialTotal);
      
      // Remove first product
      CartPage.removeProduct(product1.name);
      cy.waitForCartDeletion();
      
      // Verify updated total
      CartPage.getSubtotal().should('equal', product2.price);
      CartPage.verifyProductInCart(product2.name, 1, product2.price);
    });

    it('should handle empty cart state', () => {
      // Go directly to cart (should be empty)
      CartPage.visit();
      CartPage.verifyEmptyCart();
      
      // Add and remove a product
      const product = products[0];
      cy.addProductToCart(product);
      cy.goToCart();
      
      CartPage.removeProduct(product.name);
      cy.wait('@deleteFromCart');
      
      // Verify empty cart message
      CartPage.verifyEmptyCart();
    });
  });

  describe('Cart Persistence and Session Management', () => {
    it('should persist cart across page refreshes', () => {
      const product = products[0];
      
      // Add product to cart
      cy.addProductToCart(product);
      cy.goToCart();
      
      // Refresh page
      cy.reload();
      
      // Verify product still in cart
      CartPage.verifyProductInCart(product.name, 1, product.price);
    });

    it('should update minicart count correctly', () => {
      const product1 = products[0];
      const product2 = products[1];
      
      // Add first product
      cy.addProductToCart(product1);
      HomePage.getMiniCartCount().then(count => {
        expect(count).to.equal(1);
      });
      
      // Add second product
      cy.addProductToCart(product2);
      HomePage.getMiniCartCount().then(count => {
        expect(count).to.equal(2);
      });
      
      // Update quantity of first product
      cy.goToCart();
      CartPage.updateQuantity(product1.name, 3);
      cy.wait('@updateCart');
      
      // Go back to homepage and check count
      HomePage.visit();
      HomePage.getMiniCartCount().then(count => {
        expect(count).to.equal(4); // 3 + 1
      });
    });
  });

  describe('Advanced Cart Scenarios', () => {
    it('should handle maximum quantity limits', () => {
      const product = products[0];
      
      cy.addProductToCart(product);
      cy.goToCart();
      
      // Try to set very high quantity
      CartPage.updateQuantity(product.name, 10000);
      cy.wait('@updateCart');
      
      // Check for error or quantity limit
      cy.get('.message-error').should('exist');
    });

    it('should calculate correct totals with decimal quantities for applicable products', () => {
      const product = products.find(p => p.category === 'gear');
      
      cy.visit(product.url);
      ProductPage.setQuantity('2.5');
      ProductPage.addToCart();
      
      cy.goToCart();
      
      // Verify decimal calculation
      const expectedSubtotal = PriceCalculator.calculateSubtotal(product.price, 2.5);
      CartPage.getSubtotal().should('be.closeTo', expectedSubtotal, 0.01);
    });

    it('should validate cart totals match sum of line items', () => {
      // Add multiple products
      const productsToAdd = products.slice(0, 3);
      let calculatedTotal = 0;
      
      productsToAdd.forEach(product => {
        cy.addProductToCart(product);
        calculatedTotal += product.price * (product.quantity || 1);
      });
      
      cy.goToCart();
      
      // Get all line item subtotals and sum them
      let sumOfLineItems = 0;
      cy.get('.col.subtotal .price').each($el => {
        const price = parseFloat($el.text().replace(/[$,]/g, ''));
        sumOfLineItems += price;
      }).then(() => {
        // Compare with cart total
        CartPage.getSubtotal().should('equal', sumOfLineItems);
        expect(sumOfLineItems).to.equal(calculatedTotal);
      });
    });
  });
});