class CartPage {
  constructor() {
    this.url = '/checkout/cart';
    this.elements = {
      // Page elements
      pageTitle: '.page-title',
      cartItems: '.cart.item',
      emptyCartMessage: '.cart-empty',
      
      // Product details in cart
      productName: '.product-item-name, .product-item-details .product-item-name',
      productPrice: '.price-excluding-tax .price, .cart-price .price',
      productQty: '.input-text.qty, input[name*="qty"], .qty input',
      productSubtotal: '.col.subtotal .cart-price .price, .col.subtotal .price',
      productOptions: '.item-options, .product-item-details .item-options',
      productImage: '.product-image-photo, .product-image-container img',
      
      // Line item prices
      lineItemPrice: '.col.price .price',
      lineItemSubtotal: '.col.subtotal .cart-price .price, .col.subtotal .price',
      
      // Actions
      updateCartButton: '.action.update',
      removeItemButton: '.action-delete',
      continueShoppingLink: '.action.continue',
      proceedToCheckoutButton: '[data-role="proceed-to-checkout"]',
      
      // Cart summary
      subtotalLabel: '.totals.sub .label, .totals-subtotal .label',
      subtotalAmount: '.totals.sub .price, .totals-subtotal .amount .price, .totals-subtotal .price',
      taxLabel: '.totals-tax .label, .totals.tax .label',
      taxAmount: '.totals-tax .price, .totals.tax .price',
      shippingLabel: '.totals.shipping .label, .totals-shipping .label',
      shippingAmount: '.totals.shipping .price, .totals-shipping .price',
      grandTotalLabel: '.grand.totals .label, .totals-grand .label',
      grandTotalAmount: '.grand.totals .price, .totals-grand .amount .price, .totals-grand .price',
      
      // Discount
      discountBlock: '#block-discount, #discount-coupon-form',
      discountToggle: '#block-discount-heading',
      discountCodeInput: '#coupon_code',
      applyDiscountButton: '#discount-coupon-form .action.apply.primary, #discount-form button',
      discountAmount: '.totals.discount .price',
      
      // Shipping estimate
      estimateShippingBlock: '#block-shipping',
      estimateShippingToggle: '#block-shipping-heading',
      countrySelect: '[name="country_id"]',
      stateSelect: '[name="region_id"]',
      postcodeInput: '[name="postcode"]',
      estimateButton: '#shipping-zip-form button',
      
      // Messages
      successMessage: '[data-ui-id="message-success"]',
      errorMessage: '[data-ui-id="message-error"]',
      noticeMessage: '[data-ui-id="message-notice"]',
      
      // Loading
      loadingMask: '.loading-mask',
      
      // Gift options
      giftOptionsBlock: '#block-gift-options',
      giftOptionsToggle: '#block-gift-options-heading',
      giftMessageCheckbox: '#allow-gift-messages',
      giftMessageTextarea: '#gift-message-whole-message'
    };
  }

  visit() {
    cy.visit(this.url);
    return this;
  }

  updateQuantity(productName, newQuantity) {
    cy.get('body').then($body => {
      const nameSelectors = ['.product-item-name', '.product-item-details .product-item-name'];
      let found = false;
      
      for (const selector of nameSelectors) {
        if ($body.find(selector).filter(`:contains("${productName}")`).length > 0) {
          cy.contains(selector, productName)
            .parents('.cart.item, .item, .cart-item')
            .find('.input-text.qty, input[name*="qty"], .qty input')
            .first()
            .clear()
            .type(newQuantity.toString());
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Product ${productName} not found for quantity update`);
      }
    });
    
    cy.get(this.elements.updateCartButton).click();
    return this;
  }

  removeProduct(productName) {
    cy.get('body').then($body => {
      const nameSelectors = ['.product-item-name', '.product-item-details .product-item-name'];
      let found = false;
      
      for (const selector of nameSelectors) {
        if ($body.find(selector).filter(`:contains("${productName}")`).length > 0) {
          cy.contains(selector, productName)
            .parents('.cart.item, .item, .cart-item')
            .find('.action-delete, .remove-item, .delete')
            .first()
            .click();
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Product ${productName} not found for removal`);
      }
    });
    return this;
  }

  applyDiscountCode(code) {
    // Click to reveal the discount code section
    cy.get('#block-discount > .title').click();
    
    // Wait for the discount form to become visible
    cy.get('#coupon_code').should('be.visible');
    
    // Clear and type the discount code
    cy.get('#coupon_code').clear().type(code);
    
    // Click the apply button
    cy.get('#discount-coupon-form > .fieldset > .actions-toolbar > div.primary > .action > span').click();
    
    // Wait for the operation to complete
    cy.wait(2000);
    
    return this;
  }

  estimateShipping(country, state, postcode) {
    cy.get(this.elements.estimateShippingBlock).then($block => {
      if (!$block.hasClass('active')) {
        cy.get(this.elements.estimateShippingToggle).click();
      }
    });
    
    if (country) cy.get(this.elements.countrySelect).select(country);
    if (state) cy.get(this.elements.stateSelect).select(state);
    if (postcode) cy.get(this.elements.postcodeInput).clear().type(postcode);
    
    cy.get(this.elements.estimateButton).click();
    return this;
  }

  proceedToCheckout() {
    // Wait for cart to be fully loaded
    cy.get('.loading-mask').should('not.exist');
    
    // Wait for cart items to be visible and loaded
    cy.get('.cart.item').should('have.length.greaterThan', 0);
    
    // Wait for cart totals to be calculated and displayed
    cy.get('.grand.totals .price').should('be.visible');
    
    // Wait for any AJAX requests to complete
    cy.get('body').should('not.have.class', 'ajax-loading');
    
    // Additional wait to ensure all cart calculations are complete
    cy.wait(2000);
    
    // Now click the checkout button
    cy.get(this.elements.proceedToCheckoutButton).click();
    
    // Wait for navigation to checkout page
    cy.url().should('include', '/checkout', { timeout: 15000 });
    cy.url().should('not.include', '/checkout/cart');
    // Wait for checkout page elements to be visible
    cy.get('#shipping', { timeout: 15000 }).should('exist');
    cy.get('.loading-mask').should('not.exist');
    return this;
  }

  getSubtotal() {
    return cy.get('.totals.sub .price, .totals-subtotal .price, .subtotal .price', { timeout: 10000 })
      .first()
      .invoke('text')
      .then(text => {
        const amount = parseFloat(text.replace(/[$,]/g, ''));
        return amount;
      });
  }

  getTax() {
    return cy.get(this.elements.taxAmount).invoke('text').then(text => {
      return parseFloat(text.replace(/[$,]/g, ''));
    });
  }

  getGrandTotal() {
    return cy.get(this.elements.grandTotalAmount).invoke('text').then(text => {
      return parseFloat(text.replace(/[$,]/g, ''));
    });
  }

  verifyProductInCart(productName, expectedQty, expectedSubtotal) {
    // First, check if the product exists using multiple selectors
    cy.get('body').then($body => {
      const nameSelectors = [
        '.product-item-name',
        '.product-item-details .product-item-name',
        '.item-info .product-item-name',
        '.cart-item .product-name'
      ];
      
      let productFound = false;
      for (const selector of nameSelectors) {
        if ($body.find(selector).filter(`:contains("${productName}")`).length > 0) {
          cy.contains(selector, productName).should('exist');
          productFound = true;
          
          if (expectedQty) {
            cy.contains(selector, productName)
              .parents('.cart.item, .item, .cart-item')
              .find('.input-text.qty, input[name*="qty"], .qty input')
              .first()
              .should('have.value', expectedQty.toString());
          }
          
          if (expectedSubtotal) {
            cy.contains(selector, productName)
              .parents('.cart.item, .item, .cart-item')
              .find('.col.subtotal .cart-price .price, .col.subtotal .price')
              .first()
              .invoke('text')
              .then(text => {
                const subtotal = parseFloat(text.replace(/[$,]/g, ''));
                expect(subtotal).to.equal(expectedSubtotal);
              });
          }
          break;
        }
      }
      
      if (!productFound) {
        cy.log(`Product ${productName} not found. Available products:`, 
          $body.find('.product-item-name, .product-name').map((i, el) => el.textContent.trim()).get());
        throw new Error(`Product ${productName} not found in cart`);
      }
    });
    
    return this;
  }

  verifyEmptyCart() {
    cy.get(this.elements.emptyCartMessage).should('be.visible');
    cy.get(this.elements.cartItems).should('not.exist');
    return this;
  }

  verifyDiscountApplied(expectedDiscount) {
    cy.get(this.elements.discountAmount).should('be.visible');
    cy.get(this.elements.discountAmount).invoke('text').then(text => {
      const discount = parseFloat(text.replace(/[$,-]/g, ''));
      expect(discount).to.be.closeTo(expectedDiscount, 0.01);
    });
    return this;
  }

  // Get line item price
  getLineItemPrice(productName) {
    return cy.contains(this.elements.productName, productName)
      .parents('.cart.item')
      .find(this.elements.lineItemPrice)
      .invoke('text')
      .then(text => parseFloat(text.replace(/[$,]/g, '')));
  }

  // Get line item subtotal
  getLineItemSubtotal(productName) {
    return cy.contains(this.elements.productName, productName)
      .parents('.cart.item')
      .find(this.elements.lineItemSubtotal)
      .invoke('text')
      .then(text => parseFloat(text.replace(/[$,]/g, '')));
  }

  // Verify product options
  verifyProductOptions(productName, options) {
    cy.contains(this.elements.productName, productName)
      .parents('.cart.item')
      .find(this.elements.productOptions)
      .within(() => {
        Object.entries(options).forEach(([key, value]) => {
          cy.contains(key).should('exist');
          cy.contains(value).should('exist');
        });
      });
    return this;
  }

  // Wait for cart to update
  waitForCartUpdate() {
    cy.get(this.elements.loadingMask).should('not.exist');
    cy.get('body').should('not.have.class', 'ajax-loading');
    return this;
  }

  // Verify success message
  verifySuccessMessage(message) {
    cy.get(this.elements.successMessage)
      .should('be.visible')
      .and('contain', message);
    return this;
  }

  // Verify error message
  verifyErrorMessage(message) {
    cy.get(this.elements.errorMessage)
      .should('be.visible')
      .and('contain', message);
    return this;
  }

  // Get cart item count
  getCartItemCount() {
    return cy.get(this.elements.cartItems).then($items => {
      return $items.length;
    });
  }

  // Clear all items from cart
  clearAllItems() {
    cy.get('body').then($body => {
      if ($body.find(this.elements.cartItems).length > 0) {
        cy.get(this.elements.removeItemButton).each($btn => {
          cy.wrap($btn).click();
          cy.wait(1000); // Wait for cart update
        });
      }
    });
    return this;
  }

  // Add gift message
  addGiftMessage(message) {
    cy.get(this.elements.giftOptionsBlock).then($block => {
      if (!$block.hasClass('active')) {
        cy.get(this.elements.giftOptionsToggle).click();
      }
    });
    
    cy.get(this.elements.giftMessageCheckbox).check();
    cy.get(this.elements.giftMessageTextarea).clear().type(message);
    return this;
  }

  // Check if discount code field is visible
  isDiscountFieldVisible() {
    return cy.get(this.elements.discountBlock).then($block => {
      return $block.hasClass('active');
    });
  }

  // Get all cart items data
  getAllCartItems() {
    return cy.get(this.elements.cartItems).then($items => {
      const items = [];
      $items.each((_, item) => {
        const $item = Cypress.$(item);
        items.push({
          name: $item.find('.product-item-name').text().trim(),
          price: parseFloat($item.find('.price-excluding-tax .price').text().replace(/[$,]/g, '')),
          quantity: parseInt($item.find('.input-text.qty').val()),
          subtotal: parseFloat($item.find('.col.subtotal .cart-price .price, .col.subtotal .price').first().text().replace(/[$,]/g, ''))
        });
      });
      return items;
    });
  }
}

export default new CartPage();