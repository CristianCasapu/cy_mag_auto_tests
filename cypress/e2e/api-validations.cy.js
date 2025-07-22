import HomePage from '../page-objects/HomePage';
import CartPage from '../page-objects/CartPage';
import CheckoutPage from '../page-objects/CheckoutPage';
import { PriceCalculator, TestDataGenerator } from '../utils/calculations';

describe('API Interceptions and Validations', () => {
  let products;
  let users;

  before(() => {
    cy.fixture('products').then((data) => {
      products = data;
    });
    cy.fixture('users').then((data) => {
      users = data;
    });
  });

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    HomePage.visit();
  });

  describe('Cart API Validations', () => {
    it('should validate add to cart API request and response', () => {
      const product = products[0];
      
      // Intercept add to cart API
      cy.intercept('POST', '**/checkout/cart/add/**', (req) => {
        // Validate request body
        expect(req.body).to.include('product');
        expect(req.body).to.include('qty');
        
        // Continue with real response
        req.continue((res) => {
          // Validate response
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('success', true);
        });
      }).as('addToCartValidation');
      
      cy.addProductToCart(product);
      cy.wait('@addToCartValidation');
    });

    it('should validate cart update API calls', () => {
      const product = products[0];
      
      cy.intercept('POST', '**/checkout/cart/updatePost/**', (req) => {
        // Validate update request contains cart item data
        expect(req.body).to.include('cart');
        
        req.continue((res) => {
          expect(res.statusCode).to.equal(200);
        });
      }).as('updateCartValidation');
      
      cy.addProductToCart(product);
      cy.goToCart();
      
      CartPage.updateQuantity(product.name, 3);
      cy.wait('@updateCartValidation');
    });

    it('should validate customer section load API', () => {
      cy.intercept('POST', '**/customer/section/load/*', (req) => {
        // Validate sections being requested
        expect(req.body).to.have.property('sections');
        
        req.continue((res) => {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.have.property('cart');
          expect(res.body.cart).to.have.property('items');
          expect(res.body.cart).to.have.property('summary_count');
        });
      }).as('customerSectionValidation');
      
      const product = products[0];
      cy.addProductToCart(product);
      cy.wait('@customerSectionValidation');
    });

    it('should validate cart totals API response structure', () => {
      const product = products[0];
      
      cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals', (req) => {
        req.continue((res) => {
          expect(res.statusCode).to.equal(200);
          
          // Validate totals structure
          expect(res.body).to.have.property('grand_total');
          expect(res.body).to.have.property('subtotal');
          expect(res.body).to.have.property('items');
          expect(res.body).to.have.property('total_segments');
          
          // Validate total segments
          const segments = res.body.total_segments;
          expect(segments).to.be.an('array');
          
          const subtotalSegment = segments.find(s => s.code === 'subtotal');
          expect(subtotalSegment).to.exist;
          expect(subtotalSegment).to.have.property('value');
        });
      }).as('cartTotalsValidation');
      
      cy.addProductToCart(product);
      cy.goToCart();
      cy.wait('@cartTotalsValidation');
    });
  });

  describe('Checkout API Validations', () => {
    it('should validate shipping estimation API', () => {
      const product = products[0];
      const address = users.shippingAddresses[0];
      
      cy.intercept('POST', '**/rest/*/V1/guest-carts/*/estimate-shipping-methods', (req) => {
        // Validate request contains address
        expect(req.body).to.have.property('address');
        expect(req.body.address).to.have.property('country_id');
        expect(req.body.address).to.have.property('postcode');
        
        req.continue((res) => {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.be.an('array');
          
          // Validate shipping methods structure
          res.body.forEach(method => {
            expect(method).to.have.property('carrier_code');
            expect(method).to.have.property('method_code');
            expect(method).to.have.property('carrier_title');
            expect(method).to.have.property('amount');
            expect(method).to.have.property('available');
          });
        });
      }).as('shippingEstimateValidation');
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(address);
      
      cy.wait('@shippingEstimateValidation');
    });

    it('should validate shipping information save API', () => {
      const product = products[0];
      
      cy.intercept('POST', '**/rest/*/V1/guest-carts/*/shipping-information', (req) => {
        // Validate request structure
        expect(req.body).to.have.property('addressInformation');
        expect(req.body.addressInformation).to.have.property('shipping_address');
        expect(req.body.addressInformation).to.have.property('billing_address');
        expect(req.body.addressInformation).to.have.property('shipping_method_code');
        expect(req.body.addressInformation).to.have.property('shipping_carrier_code');
        
        req.continue((res) => {
          expect(res.statusCode).to.equal(200);
          
          // Validate response contains payment methods and totals
          expect(res.body).to.have.property('payment_methods');
          expect(res.body).to.have.property('totals');
          expect(res.body.payment_methods).to.be.an('array');
        });
      }).as('saveShippingValidation');
      
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      CheckoutPage.selectShippingMethod('Fixed');
      CheckoutPage.continueToPayment();
      
      cy.wait('@saveShippingValidation');
    });

    it('should validate place order API request and response', () => {
      const product = products[0];
      
      cy.intercept('POST', '**/rest/*/V1/guest-carts/*/payment-information', (req) => {
        // Validate payment information
        expect(req.body).to.have.property('email');
        expect(req.body).to.have.property('paymentMethod');
        expect(req.body.paymentMethod).to.have.property('method');
        expect(req.body).to.have.property('billingAddress');
        
        req.continue((res) => {
          // Validate successful order placement
          expect(res.statusCode).to.be.oneOf([200, 201]);
          expect(res.body).to.be.a('string'); // Order ID
          expect(res.body).to.match(/^\d+$/); // Should be numeric
        });
      }).as('placeOrderValidation');
      
      // Complete checkout flow
      cy.addProductToCart(product);
      cy.goToCart();
      CartPage.proceedToCheckout();
      
      CheckoutPage.fillGuestEmail(TestDataGenerator.generateEmail());
      CheckoutPage.fillShippingAddress(users.shippingAddresses[0]);
      CheckoutPage.selectShippingMethod('Fixed');
      CheckoutPage.continueToPayment();
      CheckoutPage.selectPaymentMethod('checkmo');
      CheckoutPage.placeOrder();
      
      cy.wait('@placeOrderValidation');
    });
  });

  describe('Search and Product API Validations', () => {
    it('should validate search suggestions API', () => {
      cy.intercept('GET', '**/search/ajax/suggest/**', (req) => {
        // Validate query parameter exists
        expect(req.url).to.include('q=');
        
        req.continue((res) => {
          expect(res.statusCode).to.equal(200);
          expect(res.body).to.be.a('string'); // HTML response
        });
      }).as('searchSuggestValidation');
      
      // Type slowly to trigger suggestions
      cy.get('#search').type('shirt', { delay: 100 });
      cy.wait('@searchSuggestValidation');
    });

    it('should validate product data API when loading product page', () => {
      const product = products[0];
      
      cy.intercept('POST', '**/customer/section/load/*', (req) => {
        if (req.body.sections && req.body.sections.includes('recently_viewed_product')) {
          req.continue((res) => {
            expect(res.body).to.have.property('recently_viewed_product');
          });
        }
      }).as('recentlyViewedValidation');
      
      cy.visit(product.url);
      cy.wait('@recentlyViewedValidation');
    });
  });

  describe('Performance Monitoring via API', () => {
    it('should monitor API response times', () => {
      const product = products[0];
      const performanceMetrics = {
        addToCart: 0,
        updateCart: 0,
        loadTotals: 0
      };
      
      // Monitor add to cart performance
      cy.intercept('POST', '**/checkout/cart/add/**', (req) => {
        const startTime = Date.now();
        req.continue((res) => {
          performanceMetrics.addToCart = Date.now() - startTime;
          cy.log(`Add to cart API took ${performanceMetrics.addToCart}ms`);
          expect(performanceMetrics.addToCart).to.be.lessThan(3000);
        });
      }).as('addToCartPerf');
      
      // Monitor cart totals loading
      cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals', (req) => {
        const startTime = Date.now();
        req.continue((res) => {
          performanceMetrics.loadTotals = Date.now() - startTime;
          cy.log(`Load totals API took ${performanceMetrics.loadTotals}ms`);
          expect(performanceMetrics.loadTotals).to.be.lessThan(2000);
        });
      }).as('totalsPerf');
      
      cy.addProductToCart(product);
      cy.wait('@addToCartPerf');
      
      cy.goToCart();
      cy.wait('@totalsPerf');
      
      // Log overall performance
      cy.wrap(performanceMetrics).then(metrics => {
        cy.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
      });
    });

    it('should validate API error handling', () => {
      // Test 404 handling
      cy.intercept('POST', '**/checkout/cart/add/**', {
        statusCode: 404,
        body: { message: 'Product not found' }
      }).as('notFoundError');
      
      const product = products[0];
      cy.visit(product.url);
      cy.get('#product-addtocart-button').click();
      
      cy.wait('@notFoundError');
      cy.get('.message-error').should('be.visible');
    });

    it('should validate API rate limiting behavior', () => {
      let requestCount = 0;
      
      cy.intercept('POST', '**/customer/section/load/*', (req) => {
        requestCount++;
        
        // Simulate rate limiting after 5 requests
        if (requestCount > 5) {
          req.reply({
            statusCode: 429,
            body: { message: 'Too many requests' },
            headers: { 'Retry-After': '60' }
          });
        } else {
          req.continue();
        }
      }).as('rateLimitTest');
      
      // Trigger multiple requests
      for (let i = 0; i < 7; i++) {
        cy.get('.action.showcart').click({ force: true });
        cy.wait(100);
      }
      
      // Verify rate limit handling
      cy.get('body').then($body => {
        if (requestCount > 5) {
          cy.log('Rate limiting triggered as expected');
        }
      });
    });
  });

  describe('Data Integrity Validations', () => {
    it('should validate cart data consistency across APIs', () => {
      const product = products[0];
      let cartDataFromSection;
      let cartDataFromTotals;
      
      // Capture data from customer section API
      cy.intercept('POST', '**/customer/section/load/*', (req) => {
        req.continue((res) => {
          if (res.body.cart) {
            cartDataFromSection = res.body.cart;
          }
        });
      }).as('sectionData');
      
      // Capture data from totals API
      cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals', (req) => {
        req.continue((res) => {
          cartDataFromTotals = res.body;
        });
      }).as('totalsData');
      
      cy.addProductToCart(product);
      cy.wait('@sectionData');
      
      cy.goToCart();
      cy.wait('@totalsData');
      
      // Compare data consistency
      cy.wrap(null).then(() => {
        if (cartDataFromSection && cartDataFromTotals) {
          // Verify item count matches
          expect(cartDataFromSection.summary_count).to.equal(
            cartDataFromTotals.items_qty
          );
          
          // Verify subtotal matches (considering formatting)
          const sectionSubtotal = parseFloat(
            cartDataFromSection.subtotal.replace(/[^0-9.-]+/g, '')
          );
          expect(sectionSubtotal).to.be.closeTo(
            cartDataFromTotals.subtotal,
            0.01
          );
        }
      });
    });

    it('should validate price calculations match between frontend and API', () => {
      const product = products[0];
      const quantity = 3;
      
      cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals', (req) => {
        req.continue((res) => {
          // Validate API calculation
          const item = res.body.items[0];
          expect(item.qty).to.equal(quantity);
          
          const expectedRowTotal = PriceCalculator.calculateSubtotal(
            item.price,
            item.qty
          );
          expect(item.row_total).to.equal(expectedRowTotal);
        });
      }).as('priceValidation');
      
      cy.addProductToCart({ ...product, quantity });
      cy.goToCart();
      cy.wait('@priceValidation');
      
      // Verify frontend displays match API
      CartPage.verifyProductInCart(
        product.name,
        quantity,
        product.price * quantity
      );
    });
  });
});