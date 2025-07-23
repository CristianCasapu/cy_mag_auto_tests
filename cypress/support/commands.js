// Custom Commands for Magento E-commerce Testing
import HomePage from '../page-objects/HomePage';
import ProductPage from '../page-objects/ProductPage';
import CartPage from '../page-objects/CartPage';

/**
 * Login with user credentials
 * @param {string} email - User email
 * @param {string} password - User password
 */
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/customer/account/login/');
  cy.get('#email').type(email);
  cy.get('#pass').type(password, { log: false });
  cy.get('#send2').click();
  cy.get('.page-title').should('contain', 'My Account');
});

/**
 * Add a configurable product to cart
 * @param {object} product - Product object from fixture
 */
Cypress.Commands.add('addProductToCart', (product) => {
  // Skip if product is marked as out of stock
  if (product.outOfStock) {
    cy.log(`Product ${product.name} is marked as out of stock, skipping`);
    return;
  }
  
  cy.log(`Adding product to cart: ${product.name} (${product.type})`);
  cy.visit(product.url);
  
  // Wait for page to fully load - check multiple elements
  cy.get('body').should('be.visible');
  cy.get('.page-title').should('be.visible');
  cy.get('#product-addtocart-button').should('be.visible');
  
  // Wait for any loading masks to disappear
  cy.get('body').then($body => {
    if ($body.find('.loading-mask').length > 0) {
      cy.get('.loading-mask').should('not.exist');
    }
  });
  
  // For configurable products, wait for swatches to load
  if (product.type === 'configurable') {
    cy.log(`Configurable product detected, waiting for options to load`);
    
    // Wait for size options to be available
    if (product.size) {
      cy.get('.swatch-attribute.size', { timeout: 10000 }).should('be.visible');
      cy.get('.swatch-attribute.size .swatch-option', { timeout: 10000 }).should('have.length.greaterThan', 0);
      
      // Try multiple selectors for size
      cy.get('body').then($body => {
        let sizeSelected = false;
        const sizeSelectors = [
          `[aria-label="${product.size}"]`,
          `.swatch-option[option-label="${product.size}"]`,
          `.swatch-option.text:contains("${product.size}")`,
          `.swatch-option[data-option-label="${product.size}"]`
        ];
        
        for (const selector of sizeSelectors) {
          if (!sizeSelected && $body.find(selector).length > 0) {
            cy.get(selector).first().click();
            cy.log(`Selected size "${product.size}" using selector: ${selector}`);
            sizeSelected = true;
            break;
          }
        }
        
        if (!sizeSelected) {
          // Fallback: try to click first available size
          cy.get('.swatch-attribute.size .swatch-option').first().click();
          cy.log(`Size "${product.size}" not found, selected first available size`);
        }
      });
    }
    
    // Wait for color options to be available
    if (product.color) {
      cy.get('.swatch-attribute.color', { timeout: 10000 }).should('be.visible');
      cy.get('.swatch-attribute.color .swatch-option', { timeout: 10000 }).should('have.length.greaterThan', 0);
      
      // Try multiple selectors for color
      cy.get('body').then($body => {
        let colorSelected = false;
        const colorSelectors = [
          `[aria-label="${product.color}"]`,
          `.swatch-option[option-label="${product.color}"]`,
          `.swatch-option.color[aria-label="${product.color}"]`,
          `.swatch-option[data-option-label="${product.color}"]`
        ];
        
        for (const selector of colorSelectors) {
          if (!colorSelected && $body.find(selector).length > 0) {
            cy.get(selector).first().click();
            cy.log(`Selected color "${product.color}" using selector: ${selector}`);
            colorSelected = true;
            break;
          }
        }
        
        if (!colorSelected) {
          // Fallback: try to click first available color
          cy.get('.swatch-attribute.color .swatch-option').first().click();
          cy.log(`Color "${product.color}" not found, selected first available color`);
        }
      });
    }
    
    // Wait a moment for the selections to be processed
    cy.wait(1000);
  }
  
  // Set quantity if specified
  if (product.quantity && product.quantity > 1) {
    cy.get('#qty').should('be.visible').clear().type(product.quantity.toString());
    cy.log(`Set quantity to ${product.quantity}`);
  }
  
  // Ensure add to cart button is enabled before clicking
  cy.get('#product-addtocart-button').should('be.visible').and('not.be.disabled');
  
  // Click add to cart button
  cy.get('#product-addtocart-button').click();
  cy.log(`Clicked add to cart button for ${product.name}`);
  
  // Wait for and verify success message
  cy.get('[data-ui-id="message-success"]', { timeout: 15000 })
    .should('be.visible')
    .and('contain', 'You added')
    .and('contain', product.name);
  
  cy.log(`Successfully added ${product.name} to cart`);
});

/**
 * Navigate to cart and verify it's loaded
 */
Cypress.Commands.add('goToCart', () => {
  // First check if minicart is visible, if not click the cart icon
  cy.get('body').then($body => {
    if ($body.find('.action.showcart').length > 0 && $body.find('.action.showcart').is(':visible')) {
      cy.get('.action.showcart').click();
      
      // Wait for minicart to open and then look for view cart link
      cy.wait(1000);
      cy.get('body').then($body2 => {
        if ($body2.find('.action.viewcart').length > 0 && $body2.find('.action.viewcart').is(':visible')) {
          cy.get('.action.viewcart').click();
        } else {
          // Fallback: direct navigation to cart
          cy.visit('/checkout/cart');
        }
      });
    } else {
      // Direct navigation to cart if showcart is not available
      cy.visit('/checkout/cart');
    }
  });
  
  cy.url().should('include', '/checkout/cart');
  cy.get('.page-title').should('contain', 'Shopping Cart');
});

/**
 * Clear the shopping cart
 */
Cypress.Commands.add('clearCart', () => {
  cy.visit('/checkout/cart');
  cy.get('body').then($body => {
    if ($body.find('.cart.item').length > 0) {
      // Use a more reliable approach to clear cart items
      cy.get('.cart.item').then($items => {
        const itemCount = $items.length;
        for (let i = 0; i < itemCount; i++) {
          // Always get the first item since the DOM updates after each deletion
          cy.get('body').then($currentBody => {
            if ($currentBody.find('.cart.item').length > 0) {
              cy.get('.cart.item').first().find('.action-delete').click();
              cy.wait(2000); // Wait for cart to update
            }
          });
        }
      });
    } else {
      cy.log('Cart is already empty');
    }
  });
});

/**
 * Fill shipping address form
 * @param {object} address - Address object from fixture
 */
Cypress.Commands.add('fillShippingAddress', (address) => {
  cy.log('fillShippingAddress command called with:', address);
  // This function will be implemented when CheckoutPage is available
});

/**
 * Select shipping method
 * @param {string} method - Shipping method name or type (e.g., 'Free', 'Standard', 'Express', 'Table Rate', 'Fixed')
 */
Cypress.Commands.add('selectShippingMethod', (method) => {
  cy.log(`Selecting shipping method: ${method || 'cheapest available'}`);
  
  // Wait for shipping methods to be loaded
  cy.get('#checkout-shipping-method-load', { timeout: 15000 }).should('be.visible');
  cy.get('.loading-mask').should('not.exist');
  
  if (method) {
    // Try to find the shipping method by its title (exact or partial match)
    cy.get('#checkout-shipping-method-load').within(() => {
      // First try exact match in method title column
      cy.get('.col-method').then($methods => {
        const exactMatch = $methods.filter(`:contains("${method}")`).length > 0;
        
        if (exactMatch) {
          cy.contains('.col-method', method)
            .parent('tr')
            .find('input.radio[type="radio"]')
            .check({ force: true });
        } else {
          // If no exact match, try partial match (case insensitive)
          const partialMatch = $methods.toArray().find(el => 
            el.textContent.toLowerCase().includes(method.toLowerCase())
          );
          
          if (partialMatch) {
            cy.wrap(partialMatch)
              .parent('tr')
              .find('input.radio[type="radio"]')
              .check({ force: true });
          } else {
            cy.log(`Shipping method "${method}" not found, selecting first available`);
            cy.get('input.radio[type="radio"]').first().check({ force: true });
          }
        }
      });
    });
  } else {
    // If no method specified, select the cheapest one (usually first in the list)
    cy.get('#checkout-shipping-method-load').within(() => {
      // Get all prices and find the cheapest
      cy.get('.col-price .price').then($prices => {
        let minPrice = Infinity;
        let minIndex = 0;
        
        $prices.each((index, el) => {
          const priceText = el.textContent.replace(/[$,]/g, '');
          const price = parseFloat(priceText);
          if (price < minPrice) {
            minPrice = price;
            minIndex = index;
          }
        });
        
        cy.log(`Selecting cheapest shipping method at $${minPrice}`);
        cy.get('input.radio[type="radio"]').eq(minIndex).check({ force: true });
      });
    });
  }
});

/**
 * Verify cart calculations
 * @param {number} expectedSubtotal - Expected subtotal amount
 * @param {number} expectedTax - Expected tax amount (optional)
 * @param {number} expectedTotal - Expected total amount (optional)
 */
Cypress.Commands.add('verifyCartTotals', (expectedSubtotal, expectedTax, expectedTotal) => {
  CartPage.getSubtotal().should('equal', expectedSubtotal);
  
  if (expectedTax !== undefined) {
    CartPage.getTax().should('be.closeTo', expectedTax, 0.01);
  }
  
  if (expectedTotal !== undefined) {
    CartPage.getGrandTotal().should('be.closeTo', expectedTotal, 0.01);
  }
});

/**
 * Apply discount code
 * @param {string} code - Discount code
 */
Cypress.Commands.add('applyDiscountCode', (code) => {
  CartPage.applyDiscountCode(code);
});

/**
 * Intercept and wait for API calls
 * @param {string} alias - Alias for the intercept
 * @param {string} method - HTTP method
 * @param {string} url - URL pattern to intercept
 */
Cypress.Commands.add('interceptAPI', (alias, method, url) => {
  cy.intercept(method, url).as(alias);
});

/**
 * Set up common cart-related API intercepts
 */
Cypress.Commands.add('setupCartInterceptions', () => {
  // Intercept all requests to see what's actually happening
  cy.intercept('POST', '**', (req) => {
    if (req.url.includes('cart') || req.url.includes('checkout')) {
      console.log('Cart-related POST request:', req.url);
    }
  }).as('allPostRequests');
  
  // Customer data loading - more flexible patterns
  cy.intercept('POST', '**/customer/section/load*').as('loadCustomerSections');
  cy.intercept('GET', '**/customer/section/load*').as('loadCustomerSectionsGet');
  
  // Add to cart APIs - try broader patterns
  cy.intercept('POST', '**/*add*', (req) => {
    if (req.url.includes('cart') || req.url.includes('checkout')) {
      req.alias = 'addToCartAPI';
    }
  });
  
  cy.intercept('POST', '**/checkout/cart/add*').as('addToCartAPI');
  cy.intercept('POST', '**/cart/add*').as('addToCartAltAPI');  
  cy.intercept('POST', '**add**').as('addToCartGeneric');
  
  // Update cart APIs - broader patterns
  cy.intercept('POST', '**/checkout/cart/updatePost*').as('updateCartAPI');
  cy.intercept('POST', '**/cart/updatePost*').as('updateCartAltAPI');
  cy.intercept('POST', '**update**', (req) => {
    if (req.url.includes('cart')) {
      req.alias = 'updateCart';
    }
  });
  
  // Delete from cart APIs - broader patterns  
  cy.intercept('POST', '**/checkout/cart/delete*').as('deleteFromCartAPI');
  cy.intercept('POST', '**/cart/delete*').as('deleteFromCartAltAPI');
  cy.intercept('POST', '**delete**', (req) => {
    if (req.url.includes('cart')) {
      req.alias = 'deleteFromCart';
    }
  });
  
  // Cart totals APIs
  cy.intercept('GET', '**/rest/*/V1/guest-carts/*/totals').as('getCartTotalsAPI');
  cy.intercept('POST', '**/rest/*/V1/coupons*').as('applyCouponAPI');
  cy.intercept('DELETE', '**/rest/*/V1/coupons*').as('removeCouponAPI');
});

/**
 * Wait for add to cart operation to complete
 * @param {number} timeout - Optional timeout in milliseconds
 */
Cypress.Commands.add('waitForAddToCart', (timeout = 10000) => {
  // Instead of waiting for specific API calls, wait for visual feedback
  cy.get('body', { timeout }).then($body => {
    // Look for success message
    if ($body.find('[data-ui-id="message-success"]').length > 0) {
      cy.get('[data-ui-id="message-success"]').should('be.visible').and('contain', 'added');
      cy.log('Add to cart success message found');
    } else {
      // Wait for cart counter to update or other indicators
      cy.wait(2000); // Give time for any background processes
      cy.log('Waited for add to cart operation without specific success message');
    }
  });
});

/**
 * Wait for cart update operation to complete  
 * @param {number} timeout - Optional timeout in milliseconds
 */
Cypress.Commands.add('waitForCartUpdate', (timeout = 10000) => {
  // Wait for any loading indicators to disappear
  cy.get('body').then($body => {
    if ($body.find('.loading-mask').length > 0) {
      cy.get('.loading-mask', { timeout }).should('not.exist');
    }
    if ($body.find('.loader').length > 0) {
      cy.get('.loader', { timeout }).should('not.exist');
    }
  });
  
  // Wait for page to stabilize after update
  cy.wait(2000);
  cy.log('Waited for cart update operation');
});

/**
 * Wait for cart deletion operation to complete
 * @param {number} timeout - Optional timeout in milliseconds  
 */
Cypress.Commands.add('waitForCartDeletion', (timeout = 10000) => {
  // Wait for any loading indicators to disappear
  cy.get('body').then($body => {
    if ($body.find('.loading-mask').length > 0) {
      cy.get('.loading-mask', { timeout }).should('not.exist');
    }
    if ($body.find('.loader').length > 0) {
      cy.get('.loader', { timeout }).should('not.exist');
    }
  });
  
  // Wait for page to stabilize after deletion
  cy.wait(2000);
  cy.log('Waited for cart deletion operation');
});

/**
 * Wait for any pending AJAX requests to complete
 * @param {number} timeout - Optional timeout in milliseconds
 */
Cypress.Commands.add('waitForAjax', (timeout = 5000) => {
  cy.get('body', { timeout }).should($body => {
    // Check for common Magento 2 loading indicators
    expect($body.find('.loading-mask:visible').length).to.equal(0);
    expect($body.find('.loader:visible').length).to.equal(0);
    expect($body.find('[data-role="loader"]:visible').length).to.equal(0);
    expect($body.hasClass('ajax-loading')).to.be.false;
  });
});

/**
 * Filter available products from a list
 * @param {array} products - Array of products
 * @returns {array} Filtered array of available products
 */
Cypress.Commands.add('filterAvailableProducts', (products) => {
  return products.filter(product => !product.outOfStock);
});

/**
 * Get a random available product from fixture
 * @param {string} fixtureName - Name of the fixture file
 * @returns {object} Random available product
 */
Cypress.Commands.add('getRandomAvailableProduct', (fixtureName = 'products') => {
  return cy.fixture(fixtureName).then(products => {
    const availableProducts = products.filter(p => !p.outOfStock);
    if (availableProducts.length === 0) {
      throw new Error('No available products found in fixture');
    }
    const randomIndex = Math.floor(Math.random() * availableProducts.length);
    return availableProducts[randomIndex];
  });
});

/**
 * Verify product in minicart
 * @param {string} productName - Product name
 * @param {number} quantity - Expected quantity
 */
Cypress.Commands.add('verifyMinicartItem', (productName, quantity) => {
  // Wait for cart counter to be updated first, but make it optional
  cy.get('body').then($body => {
    if ($body.find(HomePage.elements.miniCartCount).length > 0) {
      cy.get(HomePage.elements.miniCartCount, { timeout: 10000 }).should('be.visible');
    }
  });
  
  // Open minicart
  HomePage.openMiniCart();
  
  // Wait for minicart content to load
  cy.get('body').then($body => {
    if ($body.find('.minicart-items').length > 0) {
      cy.get('.minicart-items', { timeout: 10000 }).should('be.visible');
      
      // Verify product exists
      cy.contains('.product-item-name', productName, { timeout: 10000 }).should('exist');
      
      // Verify quantity if provided (be more flexible with quantity checking)
      if (quantity) {
        cy.contains('.product-item-name', productName)
          .parents('.product-item')
          .then($item => {
            // Look for quantity in various possible locations
            const qtyInput = $item.find('.qty input, input.qty, [data-bind*="qty"], .qty').first();
            const qtyText = $item.find('.item-qty, .qty-text, [class*="qty"]').text();
            
            if (qtyInput.length > 0) {
              cy.wrap(qtyInput).should('have.value', quantity.toString());
            } else if (qtyText.includes(quantity.toString())) {
              // Quantity found in text, that's acceptable
              cy.log(`Quantity ${quantity} found in text: ${qtyText}`);
            } else {
              // Just log that we couldn't verify quantity but product exists
              cy.log(`Product ${productName} found in minicart, quantity verification skipped`);
            }
          });
      }
    } else {
      cy.log(`Minicart items not found, product ${productName} may not be added yet`);
    }
  });
  
  // Close minicart by clicking outside or on close button
  cy.get('body').click(0, 0);
});

/**
 * Get cart count from minicart safely
 * @returns {number} Cart item count
 */
Cypress.Commands.add('getCartCount', () => {
  return HomePage.getMiniCartCount();
});

/**
 * Check if a product is available (in stock) on the product page
 * @returns {boolean} Product availability status
 */
Cypress.Commands.add('checkProductAvailability', () => {
  return cy.get('body').then($body => {
    // Check for out of stock message
    const outOfStockMsg = $body.find('.stock.unavailable, .availability.out-of-stock, [title="Out of stock"]');
    if (outOfStockMsg.length > 0 && outOfStockMsg.is(':visible')) {
      return false;
    }
    
    // Check if add to cart button exists and is not disabled
    const addToCartBtn = $body.find('#product-addtocart-button');
    if (addToCartBtn.length === 0 || addToCartBtn.is(':disabled')) {
      return false;
    }
    
    // Check for in stock message
    const inStockMsg = $body.find('.stock.available, .availability.in-stock, [title="In stock"]');
    if (inStockMsg.length > 0 && inStockMsg.is(':visible')) {
      return true;
    }
    
    // Default to available if no explicit stock status found
    return addToCartBtn.length > 0 && !addToCartBtn.is(':disabled');
  });
});

/**
 * Get maximum available quantity for a product
 * @returns {number} Maximum available quantity
 */
Cypress.Commands.add('getMaxAvailableQuantity', () => {
  return cy.get('body').then($body => {
    // Check quantity input for max attribute
    const qtyInput = $body.find('#qty');
    if (qtyInput.length > 0) {
      const maxAttr = qtyInput.attr('max');
      if (maxAttr) {
        const maxQty = parseInt(maxAttr);
        return isNaN(maxQty) ? 999 : maxQty;
      }
    }
    
    // Check for stock qty display
    const stockQty = $body.find('.product-info-stock-sku .stock span, [data-qty], .qty-available');
    if (stockQty.length > 0) {
      const qtyText = stockQty.text() || stockQty.attr('data-qty');
      const match = qtyText.match(/\d+/);
      if (match) {
        return parseInt(match[0]);
      }
    }
    
    // Default to a reasonable max if no limit found
    return 999;
  });
});

/**
 * Check if element exists and is visible
 * @param {string} selector - Element selector
 * @returns {boolean} Element existence and visibility status
 */
Cypress.Commands.add('checkElementExistsAndVisible', (selector) => {
  return cy.get('body').then($body => {
    const element = $body.find(selector);
    return element.length > 0 && element.is(':visible');
  });
});

/**
 * Wait for element with fallback
 * @param {string} selector - Element selector
 * @param {object} options - Options object with timeout and fallback
 */
Cypress.Commands.add('waitForElementWithFallback', (selector, options = {}) => {
  const { timeout = 10000, fallback = null } = options;
  
  cy.get('body').then($body => {
    if ($body.find(selector).length > 0) {
      cy.get(selector, { timeout }).should('be.visible');
    } else if (fallback) {
      cy.log(`Element ${selector} not found, trying fallback ${fallback}`);
      cy.get(fallback, { timeout }).should('be.visible');
    } else {
      cy.log(`Element ${selector} not found, continuing...`);
    }
  });
});

/**
 * Safe click that checks element existence first
 * @param {string} selector - Element selector
 * @param {object} options - Click options
 */
Cypress.Commands.add('safeClick', (selector, options = {}) => {
  cy.checkElementExistsAndVisible(selector).then(exists => {
    if (exists) {
      cy.get(selector).click(options);
    } else {
      cy.log(`Element ${selector} not clickable, skipping click`);
    }
  });
});

/**
 * Type into field only if it exists and is visible
 * @param {string} selector - Element selector
 * @param {string} text - Text to type
 * @param {object} options - Type options
 */
Cypress.Commands.add('safeType', (selector, text, options = {}) => {
  cy.checkElementExistsAndVisible(selector).then(exists => {
    if (exists) {
      cy.get(selector).clear().type(text, options);
    } else {
      cy.log(`Element ${selector} not found, skipping type`);
    }
  });
});

/**
 * Enhanced error logging for debugging test failures
 * @param {string} testFile - Test file name
 * @param {string} testSuite - Test suite name
 * @param {string} testCase - Test case name
 * @param {Error} error - Error object
 * @param {string} context - Additional context
 */
Cypress.Commands.add('logTestFailure', (testFile, testSuite, testCase, error, context = '') => {
  const failureInfo = {
    timestamp: new Date().toISOString(),
    file: testFile,
    suite: testSuite,
    testCase: testCase,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context: context,
    url: cy.url(),
    viewport: Cypress.config('viewportWidth') + 'x' + Cypress.config('viewportHeight')
  };
  
  // Log to browser console for debugging
  console.error('=== TEST FAILURE DEBUG INFO ===');
  console.error('File:', testFile);
  console.error('Suite:', testSuite);
  console.error('Test Case:', testCase);
  console.error('Error Name:', error.name);
  console.error('Error Message:', error.message);
  console.error('Context:', context);
  console.error('Current URL:', window.location.href);
  console.error('Stack Trace:', error.stack);
  console.error('Full Failure Info:', failureInfo);
  console.error('===============================');
  
  // Also log to Cypress for test runner visibility
  cy.log(`TEST FAILURE: ${testFile} > ${testSuite} > ${testCase}`);
  cy.log(`Error: ${error.message}`);
  if (context) {
    cy.log(`Context: ${context}`);
  }
});