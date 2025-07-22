class ProductPage {
  constructor() {
    this.elements = {
      // Product info
      productName: '.page-title',
      productPrice: '.price-box .price',
      productSku: '.product.attribute.sku .value',
      productAvailability: '.stock.available',
      
      // Product options
      sizeOptions: '.swatch-option.text',
      colorOptions: '.swatch-option.color',
      quantityInput: '#qty',
      
      // Actions
      addToCartButton: '#product-addtocart-button',
      addToWishlistButton: '.action.towishlist',
      addToCompareButton: '.action.tocompare',
      
      // Messages
      successMessage: '[data-ui-id="message-success"]',
      errorMessage: '[data-ui-id="message-error"]',
      
      // Reviews
      reviewsTab: '#tab-label-reviews-title',
      writeReviewLink: '.action.add',
      
      // Related products
      relatedProducts: '.block.related',
      upsellProducts: '.block.upsell'
    };
  }

  selectSize(size) {
    cy.get(this.elements.sizeOptions).contains(size).click();
    return this;
  }

  selectColor(color) {
    cy.get(this.elements.colorOptions).filter(`[aria-label="${color}"]`).click();
    return this;
  }

  setQuantity(quantity) {
    cy.get(this.elements.quantityInput).clear().type(quantity);
    return this;
  }

  addToCart() {
    cy.get(this.elements.addToCartButton).click();
    return this;
  }

  verifySuccessMessage(productName) {
    cy.get(this.elements.successMessage)
      .should('be.visible')
      .and('contain', `You added ${productName} to your shopping cart`);
    return this;
  }

  verifyErrorMessage(message) {
    // Check for multiple possible error message selectors
    cy.get('body').then($body => {
      if ($body.find(this.elements.errorMessage).length > 0) {
        cy.get(this.elements.errorMessage)
          .should('be.visible')
          .and('contain', message);
      } else if ($body.find('.mage-error').length > 0) {
        cy.get('.mage-error')
          .should('be.visible')
          .and('contain', message);
      } else if ($body.find('.field-error').length > 0) {
        cy.get('.field-error')
          .should('be.visible')
          .and('contain', message);
      } else {
        // Fallback to any visible error message
        cy.get('[class*="error"]:visible')
          .should('contain', message);
      }
    });
    return this;
  }

  getProductPrice() {
    return cy.get(this.elements.productPrice).first().invoke('text').then(text => {
      return parseFloat(text.replace(/[$,]/g, ''));
    });
  }

  verifyProductLoaded() {
    cy.get(this.elements.productName).should('be.visible');
    cy.get(this.elements.productPrice).should('be.visible');
    cy.get(this.elements.addToCartButton).should('be.visible');
    return this;
  }

  verifyRequiredOptionsError() {
    cy.get(this.elements.addToCartButton).click();
    cy.get(this.elements.errorMessage).should('contain', 'required');
    return this;
  }

  clickReviewsTab() {
    cy.get(this.elements.reviewsTab).click();
    return this;
  }

  verifyOutOfStock() {
    cy.get(this.elements.productAvailability).should('contain', 'Out of Stock');
    cy.get(this.elements.addToCartButton).should('be.disabled');
    return this;
  }
}

export default new ProductPage();