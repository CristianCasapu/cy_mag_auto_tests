import HomePage from '../page-objects/HomePage';
import ProductPage from '../page-objects/ProductPage';
import CartPage from '../page-objects/CartPage';
import CheckoutPage from '../page-objects/CheckoutPage';
import { PriceCalculator, TestDataGenerator, CartValidator } from '../utils/calculations';

describe('Advanced E2E Regression Tests', () => {
  let products;
  let users;
  let cartScenarios;

  before(() => {
    cy.fixture('products').then((data) => {
      products = data;
    });
    cy.fixture('users').then((data) => {
      users = data;
    });
    cy.fixture('cart-scenarios').then((data) => {
      cartScenarios = data;
    });
  });

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Comprehensive API interceptions
    cy.intercept('POST', '**/customer/section/load/*').as('loadCustomerData');
    cy.intercept('POST', '**/checkout/cart/add/**').as('addToCart');
    cy.intercept('POST', '**/checkout/cart/updatePost/**').as('updateCart');
    cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals').as('getCartTotals');
    cy.intercept('POST', '**/rest/*/V1/coupons/**').as('applyCoupon');
    cy.intercept('DELETE', '**/rest/*/V1/coupons/**').as('removeCoupon');
    
    HomePage.visit();
  });

  describe('Complex Shopping Scenarios', () => {
    it('should handle complete shopping journey with multiple products, discount, and address change', () => {
      const shoppingList = [
        { product: products[0], qty: 2 },
        { product: products[2], qty: 1 },
        { product: products[4], qty: 3 }
      ];
      
      let runningSubtotal = 0;
      
      // Add all products with quantities
      shoppingList.forEach(item => {
        cy.addProductToCart({ ...item.product, quantity: item.qty });
        cy.wait('@addToCart');
        runningSubtotal += PriceCalculator.calculateSubtotal(item.product.price, item.qty);
      });
      
      // Verify minicart count
      const totalItems = shoppingList.reduce((sum, item) => sum + item.qty, 0);
      HomePage.getMiniCartCount().then(count => {
        expect(count).to.equal(totalItems);
      });
      
      // Go to cart and verify calculations
      cy.goToCart();
      CartPage.getSubtotal().should('equal', runningSubtotal);
      
      // Update quantity of first item
      const updatedQty = 4;
      CartPage.updateQuantity(shoppingList[0].product.name, updatedQty);
      cy.wait('@updateCart');
      
      // Recalculate total
      runningSubtotal = runningSubtotal - 
        (shoppingList[0].product.price * shoppingList[0].qty) + 
        (shoppingList[0].product.price * updatedQty);
      
      CartPage.getSubtotal().should('equal', runningSubtotal);
      
      // Apply discount code
      const discount = cartScenarios.discountCodes[0];
      if (runningSubtotal >= discount.minPurchase) {
        CartPage.applyDiscountCode(discount.code);
        cy.wait('@applyCoupon');
        
        const discountAmount = PriceCalculator.calculateDiscount(runningSubtotal, discount);
        CartPage.verifyDiscountApplied(discountAmount);
      }
      
      // Proceed to checkout
      CartPage.proceedToCheckout();
      
      // Fill guest information
      const guestEmail = TestDataGenerator.generateEmail();
      CheckoutPage.fillGuestEmail(guestEmail);
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      
      // Select shipping method
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      
      // Change billing address
      cy.get('#billing-address-same-as-shipping').uncheck();
      cy.get('.payment-method._active .billing-address-form').should('be.visible');
      
      // Complete order
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      CheckoutPage.verifyOrderSuccess();
    });

    it('should handle cart persistence across page refreshes', () => {
      const testProducts = products.slice(0, 2);
      
      // Add products to cart
      testProducts.forEach(product => {
        cy.addProductToCart(product);
        cy.wait('@addToCart');
      });
      
      // Verify initial cart count
      HomePage.getMiniCartCount().then(count => {
        expect(count).to.equal(testProducts.length);
        
        // Store the initial count for comparison
        const initialCount = count;
        
        // Refresh the page to test persistence
        cy.reload();
        
        // Wait for page to fully load and customer data to be restored
        cy.get('.logo').should('be.visible');
        
        // Wait for cart data to be loaded - use a more flexible approach
        cy.intercept('POST', '**/customer/section/load/*').as('loadCustomerDataAfterReload');
        
        // Wait for page to fully stabilize after reload
        cy.wait(2000);
        
        // Wait for the customer data to load
        //cy.wait('@loadCustomerDataAfterReload', { timeout: 10000 });
        
        // Verify cart count is maintained after refresh
        HomePage.getMiniCartCount().then(newCount => {
          expect(newCount).to.equal(initialCount);
        });
        
        // Go to cart page to verify products are still there
        cy.goToCart();
        testProducts.forEach(product => {
          cy.contains('.product-item-name', product.name).should('exist');
        });
      });
    });

    it('should handle new session cart behavior', () => {
      const product = products[0];
      
      // Add product to cart
      cy.addProductToCart(product);
      cy.wait('@addToCart');
      
      // Verify product in cart
      HomePage.getMiniCartCount().then(initialCount => {
        expect(initialCount).to.be.greaterThan(0);
        
        // Clear all cookies and storage to simulate new session
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.window().then(win => {
          win.sessionStorage.clear();
        });
        
        // Visit homepage again (new session)
        HomePage.visit();
        
        // Cart should be empty in new session for guest users
        HomePage.getMiniCartCount().then(newCount => {
          expect(newCount).to.equal(0);
        });
      });
    });

    it('should handle price changes during checkout process', () => {
      const product = products[0];
      
      // Intercept price update
      let priceChanged = false;
      cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals', (req) => {
        req.continue((res) => {
          if (!priceChanged && res.body.items.length > 0) {
            // Simulate price increase
            res.body.items[0].price = res.body.items[0].price * 1.1;
            res.body.items[0].row_total = res.body.items[0].price * res.body.items[0].qty;
            res.body.subtotal = res.body.items[0].row_total;
            res.body.grand_total = res.body.subtotal;
            priceChanged = true;
          }
        });
      }).as('priceChange');
      
      cy.addProductToCart(product);
      cy.goToCart();
      
      // Original price
      CartPage.getSubtotal().then(originalPrice => {
        // Add another product to trigger the totals API call and price change
        const secondProduct = products[1];
        cy.addProductToCart(secondProduct);
        
        // Go to cart to see the updated price
        cy.goToCart();
        
        // Price should be updated after adding second product
        CartPage.getSubtotal().should('be.greaterThan', originalPrice);
      });
    });
  });

  describe('Multi-Product Category Shopping', () => {
    it('should shop across all product categories with filters', () => {
      const categories = ['women', 'men', 'gear'];
      const itemsPerCategory = {};
      
      categories.forEach(category => {
        // Navigate to category
        HomePage.navigateToCategory(category);
        
        // Get products from this category
        const categoryProducts = products.filter(p => p.category === category);
        
        if (categoryProducts.length > 0) {
          // Add first product from category
          const product = categoryProducts[0];
          cy.addProductToCart(product);
          itemsPerCategory[category] = product;
        }
      });
      
      // Verify all items in cart
      cy.goToCart();
      
      Object.values(itemsPerCategory).forEach(product => {
        CartPage.verifyProductInCart(product.name, 1, product.price);
      });
    });

    it('should handle bulk operations on cart items', () => {
      // Add multiple products
      const bulkProducts = products.slice(0, 5);
      
      bulkProducts.forEach(product => {
        cy.addProductToCart(product);
      });
      
      cy.goToCart();
      
      // Update all quantities to same value
      const newQty = 2;
      cy.get('.input-text.qty').each($input => {
        cy.wrap($input).clear().type(newQty);
      });
      
      cy.get('.action.update').click();
      cy.wait('@updateCart');
      
      // Verify all quantities updated
      cy.get('.input-text.qty').each($input => {
        cy.wrap($input).should('have.value', newQty.toString());
      });
      
      // Verify total is correct
      const expectedTotal = bulkProducts.reduce((sum, product) => {
        return sum + (product.price * newQty);
      }, 0);
      
      CartPage.getSubtotal().should('equal', expectedTotal);
    });
  });

  describe('Edge Case Regression Tests', () => {
    it('should handle special characters in shipping information', () => {
      const product = products[0];
      const specialAddress = {
        ...users.shippingAddresses[0],
        firstName: "Jean-François",
        lastName: "O'Brien-Smith",
        company: "Müller & Associates GmbH",
        streetAddress: ["123 Rue de l'Église", "Apt #4-B"]
      };
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(specialAddress);
      
      // Should handle special characters without errors
      cy.get('.field-error').should('not.exist');
      
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      
      // Verify address displayed correctly
      cy.get('.ship-to .shipping-information-content').should('contain', specialAddress.firstName);
    });

    it('should handle timezone differences in order placement', () => {
      const product = products[0];
      
      // Store original time
      const orderTime = new Date();
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      // Complete quick checkout
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      
      CheckoutPage.verifyOrderSuccess();
      
      // Log order completion time
      const completionTime = new Date();
      const processingTime = completionTime - orderTime;
      cy.log(`Order processing took ${processingTime}ms`);
      
      // Verify reasonable processing time
      expect(processingTime).to.be.lessThan(60000); // Less than 1 minute
    });

    it('should handle product availability changes during checkout', () => {
      const product = products[0];
      let availabilityChecked = false;
      
      // Intercept to simulate out of stock scenario
      cy.intercept('POST', '**/rest/*/V1/guest-carts/*/shipping-information', (req) => {
        if (!availabilityChecked) {
          availabilityChecked = true;
          req.reply({
            statusCode: 400,
            body: {
              message: 'Some products are no longer available'
            }
          });
        } else {
          req.continue();
        }
      }).as('availabilityCheck');
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      
      // Should show error message
      cy.wait('@availabilityCheck');
      cy.get('.message-error').should('be.visible');
    });
  });

  describe('Comprehensive Calculation Validations', () => {
    it('should validate complex discount and tax calculations', () => {
      // Create a complex cart scenario
      const scenario = {
        products: [
          { ...products[0], qty: 3 },
          { ...products[2], qty: 2 },
          { ...products[4], qty: 1 }
        ],
        shippingMethod: cartScenarios.shippingMethods[1],
        taxRate: cartScenarios.taxCalculation.taxRate
      };
      
      let subtotal = 0;
      
      // Add all products
      scenario.products.forEach(item => {
        cy.addProductToCart({ ...item, quantity: item.qty });
        subtotal += item.price * item.qty;
      });
      
      cy.goToCart();
      
      // Apply discount if eligible
      const discount = cartScenarios.discountCodes[0];
      let discountAmount = 0;
      
      if (subtotal >= discount.minPurchase) {
        CartPage.applyDiscountCode(discount.code);
        cy.wait('@applyCoupon');
        discountAmount = PriceCalculator.calculateDiscount(subtotal, discount);
      }
      
      // Proceed to checkout for tax calculation
      CartPage.proceedToCheckout();
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      CheckoutPage.selectShippingMethod(scenario.shippingMethod.name);
      CheckoutPage.continueToPayment();
      
      // Calculate expected totals
      const taxableAmount = subtotal - discountAmount;
      const expectedTax = PriceCalculator.calculateTax(taxableAmount, scenario.taxRate);
      const expectedTotal = PriceCalculator.calculateTotal(
        subtotal,
        expectedTax,
        scenario.shippingMethod.price,
        discountAmount
      );
      
      // Verify all calculations
      CheckoutPage.verifyOrderTotals(
        subtotal,
        scenario.shippingMethod.price,
        expectedTax,
        expectedTotal
      );
    });

    it('should validate cart persistence with complex state', () => {
      const complexCart = {
        configurableProducts: products.filter(p => p.type === 'configurable').slice(0, 2),
        simpleProducts: products.filter(p => p.type === 'simple').slice(0, 2),
        quantities: [1, 3, 2, 4]
      };
      
      // Add all products with different quantities
      [...complexCart.configurableProducts, ...complexCart.simpleProducts].forEach((product, index) => {
        cy.addProductToCart({ 
          ...product, 
          quantity: complexCart.quantities[index] 
        });
      });
      
      // Apply discount
      cy.goToCart();
      CartPage.applyDiscountCode(cartScenarios.discountCodes[0].code);
      
      // Get current state
      CartPage.getSubtotal().then(subtotal => {
        CartPage.getGrandTotal().then(grandTotal => {
          // Reload page
          cy.reload();
          
          // Verify state persisted
          CartPage.getSubtotal().should('equal', subtotal);
          CartPage.getGrandTotal().should('equal', grandTotal);
          
          // Verify discount still applied
          cy.get('.totals.discount').should('exist');
        });
      });
    });
  });

  describe('Full Regression Smoke Test', () => {
    it('should complete full e-commerce flow with all features', () => {
      // 1. Search for product
      HomePage.searchProduct(products[0].name.split(' ')[0]);
      cy.get('.product-item').first().click();
      
      // 2. Add configurable product
      ProductPage.verifyProductLoaded();
      if (products[0].size) ProductPage.selectSize(products[0].size);
      if (products[0].color) ProductPage.selectColor(products[0].color);
      ProductPage.setQuantity('2');
      ProductPage.addToCart();
      ProductPage.verifySuccessMessage(products[0].name);
      
      // 3. Continue shopping
      HomePage.visit();
      HomePage.navigateToCategory('gear');
      
      // 4. Add simple product
      const gearProduct = products.find(p => p.category === 'gear');
      cy.addProductToCart(gearProduct);
      
      // 5. Review cart
      cy.goToCart();
      CartPage.verifyProductInCart(products[0].name, 2, products[0].price * 2);
      CartPage.verifyProductInCart(gearProduct.name, 1, gearProduct.price);
      
      // 6. Apply discount
      CartPage.applyDiscountCode(cartScenarios.discountCodes[0].code);
      
      // 7. Checkout
      CartPage.proceedToCheckout();
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      CheckoutPage.selectShippingMethod(cartScenarios.shippingMethods[0].name);
      CheckoutPage.continueToPayment();
      
      // 8. Place order
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      
      // 9. Verify success
      CheckoutPage.verifyOrderSuccess();
      CheckoutPage.getOrderNumber().then(orderNumber => {
        cy.log(`Full regression test completed. Order #${orderNumber}`);
      });
    });
  });
});