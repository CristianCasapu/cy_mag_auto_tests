class CheckoutPage {
  constructor() {
    this.url = '/checkout';
    this.elements = {
      // Checkout steps
      shippingStep: '#shipping',
      paymentStep: '#payment',
      
      // Shipping form
      emailInput: '#customer-email',
      firstNameInput: '[name="firstname"]',
      lastNameInput: '[name="lastname"]',
      companyInput: '[name="company"]',
      streetAddress1Input: '[name="street[0]"]',
      streetAddress2Input: '[name="street[1]"]',
      cityInput: '[name="city"]',
      stateSelect: '[name="region_id"]',
      postcodeInput: '[name="postcode"]',
      countrySelect: '[name="country_id"]',
      telephoneInput: '[name="telephone"]',
      
      // Shipping methods
      shippingMethodsContainer: '#checkout-shipping-method-load',
      shippingMethodRadio: '.radio',
      shippingMethodLabel: '.col.col-method',
      shippingMethodPrice: '.col.col-price .price',
      
      // Payment methods
      paymentMethodsContainer: '.payment-methods',
      paymentMethodRadio: '.payment-method input[type="radio"]',
      
      // Billing address
      billingAddressSame: '#billing-address-same-as-shipping',
      billingAddressForm: '.payment-method._active .billing-address-form',
      
      // Order summary
      orderSummaryToggle: '.opc-block-summary',
      cartItemsContainer: '.minicart-items',
      orderSubtotal: '.totals.sub .price',
      orderShipping: '.totals.shipping .price',
      orderTax: '.totals-tax .price',
      orderTotal: '.grand.totals .price',
      
      // Actions
      continueButton: '#shipping-method-buttons-container .continue',
      placeOrderButton: '.payment-method._active button[type="submit"]',
      
      // Loading
      loadingMask: '.loading-mask',
      
      // Messages
      errorMessage: '.message-error',
      
      // Success page
      orderSuccessPage: '.checkout-success',
      orderNumber: '.checkout-success .order-number',
      continueShoppingButton: '.action.primary.continue'
    };
  }

  fillGuestEmail(email) {
    cy.get(this.elements.emailInput).type(email);
    return this;
  }

  fillShippingAddress(address) {
    if (address.firstName) cy.get(this.elements.firstNameInput).clear().type(address.firstName);
    if (address.lastName) cy.get(this.elements.lastNameInput).clear().type(address.lastName);
    if (address.company) cy.get(this.elements.companyInput).clear().type(address.company);
    if (address.streetAddress[0]) cy.get(this.elements.streetAddress1Input).clear().type(address.streetAddress[0]);
    if (address.streetAddress[1]) cy.get(this.elements.streetAddress2Input).clear().type(address.streetAddress[1]);
    if (address.city) cy.get(this.elements.cityInput).clear().type(address.city);
    if (address.state) cy.get(this.elements.stateSelect).select(address.state);
    if (address.zip) cy.get(this.elements.postcodeInput).clear().type(address.zip);
    if (address.country) cy.get(this.elements.countrySelect).select(address.country);
    if (address.phone) cy.get(this.elements.telephoneInput).clear().type(address.phone);
    return this;
  }

  selectShippingMethod(methodName) {
    cy.get(this.elements.shippingMethodsContainer).should('be.visible');
    cy.contains(this.elements.shippingMethodLabel, methodName)
      .parent()
      .find(this.elements.shippingMethodRadio)
      .check();
    return this;
  }

  getShippingMethodPrice(methodName) {
    return cy.contains(this.elements.shippingMethodLabel, methodName)
      .parent()
      .find(this.elements.shippingMethodPrice)
      .invoke('text')
      .then(text => parseFloat(text.replace(/[$,]/g, '')));
  }

  continueToPayment() {
    cy.get(this.elements.continueButton).click();
    cy.get(this.elements.paymentStep).should('be.visible');
    return this;
  }

  selectPaymentMethod(method) {
    cy.get(this.elements.paymentMethodsContainer).should('be.visible');
    cy.get(`#${method}`).check();
    return this;
  }

  placeOrder() {
    cy.get(this.elements.placeOrderButton).should('be.visible').click();
    return this;
  }

  verifyOrderSuccess() {
    cy.get(this.elements.orderSuccessPage, { timeout: 15000 }).should('be.visible');
    cy.get(this.elements.orderNumber).should('exist');
    return this;
  }

  getOrderNumber() {
    return cy.get(this.elements.orderNumber).invoke('text');
  }

  verifyOrderTotals(expectedSubtotal, expectedShipping, expectedTax, expectedTotal) {
    if (expectedSubtotal) {
      cy.get(this.elements.orderSubtotal).invoke('text').then(text => {
        const subtotal = parseFloat(text.replace(/[$,]/g, ''));
        expect(subtotal).to.equal(expectedSubtotal);
      });
    }
    
    if (expectedShipping) {
      cy.get(this.elements.orderShipping).invoke('text').then(text => {
        const shipping = parseFloat(text.replace(/[$,]/g, ''));
        expect(shipping).to.equal(expectedShipping);
      });
    }
    
    if (expectedTax) {
      cy.get(this.elements.orderTax).invoke('text').then(text => {
        const tax = parseFloat(text.replace(/[$,]/g, ''));
        expect(tax).to.be.closeTo(expectedTax, 0.01);
      });
    }
    
    if (expectedTotal) {
      cy.get(this.elements.orderTotal).invoke('text').then(text => {
        const total = parseFloat(text.replace(/[$,]/g, ''));
        expect(total).to.be.closeTo(expectedTotal, 0.01);
      });
    }
    
    return this;
  }

  waitForLoadingToComplete() {
    cy.get(this.elements.loadingMask).should('not.exist');
    return this;
  }

  verifyValidationError(fieldName, errorMessage) {
    cy.get(`[name="${fieldName}"]`)
      .parent()
      .find('.field-error')
      .should('contain', errorMessage);
    return this;
  }
}

export default new CheckoutPage();