class CartPage {
  constructor() {
    this.url = '/checkout/cart';
    this.elements = {
      // Page elements
      pageTitle: '.page-title',
      cartItems: '.cart.item',
      emptyCartMessage: '.cart-empty',
      
      // Product details in cart
      productName: '.product-item-name',
      productPrice: '.price-excluding-tax .price',
      productQty: '.input-text.qty',
      productSubtotal: '.col.subtotal .price',
      
      // Actions
      updateCartButton: '.action.update',
      removeItemButton: '.action-delete',
      continueShoppingLink: '.action.continue',
      proceedToCheckoutButton: '[data-role="proceed-to-checkout"]',
      
      // Cart summary
      subtotalLabel: '.totals.sub .label',
      subtotalAmount: '.totals.sub .price',
      taxLabel: '.totals-tax .label',
      taxAmount: '.totals-tax .price',
      shippingLabel: '.totals.shipping .label',
      shippingAmount: '.totals.shipping .price',
      grandTotalLabel: '.grand.totals .label',
      grandTotalAmount: '.grand.totals .price',
      
      // Discount
      discountBlock: '#block-discount',
      discountToggle: '#block-discount-heading',
      discountCodeInput: '#discount-code',
      applyDiscountButton: '#discount-form button',
      discountAmount: '.totals.discount .price',
      
      // Shipping estimate
      estimateShippingBlock: '#block-shipping',
      estimateShippingToggle: '#block-shipping-heading',
      countrySelect: '[name="country_id"]',
      stateSelect: '[name="region_id"]',
      postcodeInput: '[name="postcode"]',
      estimateButton: '#shipping-zip-form button'
    };
  }

  visit() {
    cy.visit(this.url);
    return this;
  }

  updateQuantity(productName, newQuantity) {
    cy.contains(this.elements.productName, productName)
      .parents('.cart.item')
      .find(this.elements.productQty)
      .clear()
      .type(newQuantity);
    cy.get(this.elements.updateCartButton).click();
    return this;
  }

  removeProduct(productName) {
    cy.contains(this.elements.productName, productName)
      .parents('.cart.item')
      .find(this.elements.removeItemButton)
      .click();
    return this;
  }

  applyDiscountCode(code) {
    cy.get(this.elements.discountBlock).then($block => {
      if (!$block.hasClass('active')) {
        cy.get(this.elements.discountToggle).click();
      }
    });
    cy.get(this.elements.discountCodeInput).clear().type(code);
    cy.get(this.elements.applyDiscountButton).click();
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
    cy.get(this.elements.proceedToCheckoutButton).click();
    return this;
  }

  getSubtotal() {
    return cy.get(this.elements.subtotalAmount).invoke('text').then(text => {
      return parseFloat(text.replace(/[$,]/g, ''));
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
    cy.contains(this.elements.productName, productName).should('exist');
    
    if (expectedQty) {
      cy.contains(this.elements.productName, productName)
        .parents('.cart.item')
        .find(this.elements.productQty)
        .should('have.value', expectedQty.toString());
    }
    
    if (expectedSubtotal) {
      cy.contains(this.elements.productName, productName)
        .parents('.cart.item')
        .find(this.elements.productSubtotal)
        .invoke('text')
        .then(text => {
          const subtotal = parseFloat(text.replace(/[$,]/g, ''));
          expect(subtotal).to.equal(expectedSubtotal);
        });
    }
    
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
}

export default new CartPage();