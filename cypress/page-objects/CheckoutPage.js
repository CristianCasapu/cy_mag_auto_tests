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
      emailError: '#customer-email-error',
      fieldError: '.field-error',
      
      // Guest checkout
      guestCheckoutOption: '#checkout-step-login',
      loginOption: '.action.login',
      
      // Billing same as shipping
      sameAsShippingCheckbox: '#billing-address-same-as-shipping-checkmo',
      
      // Success page
      orderSuccessPage: '.checkout-success',
      orderNumber: '.checkout-success > :nth-child(1) > span',
      continueShoppingButton: '.action.primary.continue'
    };
  }

  waitForCheckoutPageToLoad() {
    // Wait for any loading masks to disappear first
    cy.get(this.elements.loadingMask).should('not.exist');
    cy.get('body').should('not.have.class', 'checkout-loading');
    
    // Then wait for shipping step container
    cy.get(this.elements.shippingStep, { timeout: 15000 }).should('exist');
    
    // Wait for email input to be visible and enabled
    cy.get(this.elements.emailInput, { timeout: 15000 })
      .should('exist')
      .should('be.visible')
      .should('not.be.disabled');
    
    return this;
  }

  verifyAllFormFieldsVisible() {
    cy.get(this.elements.emailInput).should('be.visible');
    cy.get(this.elements.firstNameInput).should('be.visible');
    cy.get(this.elements.lastNameInput).should('be.visible');
    cy.get(this.elements.streetAddress1Input).should('be.visible');
    cy.get(this.elements.cityInput).should('be.visible');
    cy.get(this.elements.stateSelect).should('be.visible');
    cy.get(this.elements.postcodeInput).should('be.visible');
    cy.get(this.elements.countrySelect).should('be.visible');
    cy.get(this.elements.telephoneInput).should('be.visible');
    return this;
  }

  fillGuestEmail(email) {
    this.waitForCheckoutPageToLoad();
    cy.get(this.elements.emailInput)
      .should('be.visible')
      .should('not.be.disabled')
      .clear()
      .type(email);
    return this;
  }

  clearGuestEmail() {
    cy.get(this.elements.emailInput).should('be.visible').clear();
    return this;
  }

  clearFirstName() {
    cy.get(this.elements.firstNameInput).should('be.visible').clear();
    return this;
  }

  verifyEmailError(errorMessage) {
    cy.get(this.elements.emailError)
      .should('be.visible')
      .and('contain', errorMessage);
    return this;
  }

  fillShippingAddress(address) {
    if (address.firstName) cy.get(this.elements.firstNameInput).should('be.visible').clear().type(address.firstName);
    if (address.lastName) cy.get(this.elements.lastNameInput).should('be.visible').clear().type(address.lastName);
    if (address.company) cy.get(this.elements.companyInput).should('be.visible').clear().type(address.company);
    if (address.streetAddress[0]) cy.get(this.elements.streetAddress1Input).should('be.visible').clear().type(address.streetAddress[0]);
    if (address.streetAddress[1]) cy.get(this.elements.streetAddress2Input).should('be.visible').clear().type(address.streetAddress[1]);
    if (address.city) cy.get(this.elements.cityInput).should('be.visible').clear().type(address.city);
    if (address.state) cy.get(this.elements.stateSelect).should('be.visible').select(address.state);
    if (address.zip) cy.get(this.elements.postcodeInput).should('be.visible').clear().type(address.zip);
    if (address.country) cy.get(this.elements.countrySelect).should('be.visible').select(address.country);
    if (address.phone) cy.get(this.elements.telephoneInput).should('be.visible').clear().type(address.phone);
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
    cy.get(`#${method}`).check({ force: true });
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

  // Wait for shipping methods to load
  waitForShippingMethods() {
    cy.get(this.elements.shippingMethodsContainer).should('be.visible');
    cy.get(this.elements.loadingMask).should('not.exist');
    cy.get(this.elements.shippingMethodRadio).should('have.length.greaterThan', 0);
    return this;
  }

  // Wait for payment methods to load
  waitForPaymentMethods() {
    cy.get(this.elements.paymentMethodsContainer).should('be.visible');
    cy.get(this.elements.loadingMask).should('not.exist');
    return this;
  }

  // Check if billing same as shipping is selected
  isBillingSameAsShipping() {
    return cy.get(this.elements.sameAsShippingCheckbox).then($checkbox => {
      return $checkbox.is(':checked');
    });
  }

  // Toggle billing same as shipping
  toggleBillingSameAsShipping() {
    cy.get(this.elements.sameAsShippingCheckbox).should('be.visible').click();
    // Wait for billing form to show/hide based on checkbox state
    cy.wait(500);
    return this;
  }

  // Fill billing address (when different from shipping)
  fillBillingAddress(address) {
    // First ensure billing form is visible
    this.isBillingSameAsShipping().then(isSame => {
      if (isSame) {
        this.toggleBillingSameAsShipping();
      }
    });
    
    cy.get(this.elements.billingAddressForm).should('be.visible').within(() => {
      if (address.firstName) cy.get('[name="firstname"]').should('be.visible').clear().type(address.firstName);
      if (address.lastName) cy.get('[name="lastname"]').should('be.visible').clear().type(address.lastName);
      if (address.company) cy.get('[name="company"]').should('be.visible').clear().type(address.company);
      if (address.streetAddress[0]) cy.get('[name="street[0]"]').should('be.visible').clear().type(address.streetAddress[0]);
      if (address.streetAddress[1]) cy.get('[name="street[1]"]').should('be.visible').clear().type(address.streetAddress[1]);
      if (address.city) cy.get('[name="city"]').should('be.visible').clear().type(address.city);
      if (address.state) cy.get('[name="region_id"]').should('be.visible').select(address.state);
      if (address.zip) cy.get('[name="postcode"]').should('be.visible').clear().type(address.zip);
      if (address.country) cy.get('[name="country_id"]').should('be.visible').select(address.country);
      if (address.phone) cy.get('[name="telephone"]').should('be.visible').clear().type(address.phone);
    });
    
    return this;
  }

  // Verify checkout step is active
  verifyActiveStep(step) {
    const stepMap = {
      'shipping': this.elements.shippingStep,
      'payment': this.elements.paymentStep
    };
    
    cy.get(stepMap[step]).should('have.class', '_active');
    return this;
  }

  // Get all available shipping methods
  getAvailableShippingMethods() {
    return cy.get(this.elements.shippingMethodLabel).then($methods => {
      const methods = [];
      $methods.each((_, el) => {
        methods.push(Cypress.$(el).text().trim());
      });
      return methods;
    });
  }

  // Open order summary (mobile)
  openOrderSummary() {
    cy.get(this.elements.orderSummaryToggle).then($toggle => {
      if (!$toggle.hasClass('active')) {
        cy.wrap($toggle).click();
      }
    });
    return this;
  }
}

export default new CheckoutPage();