class HomePage {
  constructor() {
    this.url = '/';
    this.elements = {
      // Header elements
      logo: '.logo',
      searchInput: '#search',
      searchButton: '.action.search',
      miniCart: '.action.showcart',
      miniCartCount: '.counter-number',
      signInLink: '.authorization-link a',
      
      // Navigation
      mainNav: '.navigation',
      womenMenu: '#ui-id-4',
      menMenu: '#ui-id-5',
      gearMenu: '#ui-id-6',
      trainingMenu: '#ui-id-7',
      saleMenu: '#ui-id-8',
      
      // Customer account
      accountMenu: '.customer-welcome',
      accountMenuDropdown: '.customer-menu',
      myAccountLink: '.customer-menu a[href*="/customer/account/"]',
      signOutLink: '.customer-menu a[href*="/customer/account/logout/"]',
      
      // Login form elements (for guest checkout scenarios)
      emailField: '#email',
      passwordField: '#pass',
      signInButton: '#send2',
      forgotPasswordLink: '.action.remind',
      createAccountLink: '.action.create',
      loginError: '.message-error',
      
      // Registration form elements
      firstNameField: '#firstname',
      lastNameField: '#lastname',
      emailAddressField: '#email_address',
      passwordField: '#password',
      passwordConfirmField: '#password-confirmation',
      createAccountButton: 'button[title="Create an Account"]',
      registrationError: '.message-error',
      
      // Product sections
      hotSellers: '.block-products-list',
      productItems: '.product-item',
      productImage: '.product-image-photo',
      productName: '.product-item-name',
      productPrice: '.price',
      addToCartButton: '.action.tocart',
      
      // Messages
      successMessage: '[data-ui-id="message-success"]',
      errorMessage: '[data-ui-id="message-error"]',
      noticeMessage: '[data-ui-id="message-notice"]',
      
      // Loading indicators
      loadingMask: '.loading-mask',
      loader: '.loader'
    };
  }

  visit() {
    cy.visit(this.url);
    return this;
  }

  searchProduct(productName) {
    cy.get(this.elements.searchInput).type(productName);
    cy.get(this.elements.searchButton).click();
    return this;
  }

  navigateToCategory(category) {
    const categoryMap = {
      'women': this.elements.womenMenu,
      'men': this.elements.menMenu,
      'gear': this.elements.gearMenu,
      'training': this.elements.trainingMenu,
      'sale': this.elements.saleMenu
    };
    
    cy.get(categoryMap[category.toLowerCase()]).click();
    return this;
  }

  clickSignIn() {
    cy.get(this.elements.signInLink).click();
    return this;
  }

  openMiniCart() {
    cy.get(this.elements.miniCart).click();
    return this;
  }

  getMiniCartCount() {
    // Check if element exists first, then get count
    return cy.get('body').then($body => {
      if ($body.find(this.elements.miniCartCount).length > 0) {
        return cy.get(this.elements.miniCartCount)
          .invoke('text')
          .then(text => {
            const count = parseInt(text.trim());
            return isNaN(count) ? 0 : count;
          });
      } else {
        // Element doesn't exist, return 0 wrapped in Cypress command
        return cy.then(() => 0);
      }
    });
  }

  selectProductByName(productName) {
    cy.contains(this.elements.productName, productName).click();
    return this;
  }

  verifyHomepageLoaded() {
    cy.get(this.elements.logo).should('be.visible');
    cy.get(this.elements.mainNav).should('be.visible');
    return this;
  }

  // Login form methods
  fillLoginForm(email, password) {
    cy.get(this.elements.emailField).clear().type(email);
    cy.get(this.elements.passwordField).clear().type(password, { log: false });
    return this;
  }

  submitLogin() {
    cy.get(this.elements.signInButton).click();
    return this;
  }

  verifyLoginError(expectedMessage) {
    cy.get(this.elements.loginError)
      .should('be.visible')
      .and('contain', expectedMessage);
    return this;
  }

  // Registration form methods
  fillRegistrationForm(userData) {
    if (userData.firstName) cy.get(this.elements.firstNameField).clear().type(userData.firstName);
    if (userData.lastName) cy.get(this.elements.lastNameField).clear().type(userData.lastName);
    if (userData.email) cy.get(this.elements.emailAddressField).clear().type(userData.email);
    if (userData.password) {
      cy.get(this.elements.passwordField).clear().type(userData.password, { log: false });
      cy.get(this.elements.passwordConfirmField).clear().type(userData.password, { log: false });
    }
    return this;
  }

  submitRegistration() {
    cy.get(this.elements.createAccountButton).click();
    return this;
  }

  verifyRegistrationError(expectedMessage) {
    cy.get(this.elements.registrationError)
      .should('be.visible')
      .and('contain', expectedMessage);
    return this;
  }

  // Customer account methods
  isLoggedIn() {
    return cy.get('body').then($body => {
      return $body.find(this.elements.accountMenu).length > 0;
    });
  }

  openAccountMenu() {
    cy.get(this.elements.accountMenu).click();
    cy.get(this.elements.accountMenuDropdown).should('be.visible');
    return this;
  }

  signOut() {
    this.openAccountMenu();
    cy.get(this.elements.signOutLink).click();
    return this;
  }

  // Navigation enhancements
  navigateToSubcategory(mainCategory, subCategory) {
    const categoryMap = {
      'women': this.elements.womenMenu,
      'men': this.elements.menMenu,
      'gear': this.elements.gearMenu,
      'training': this.elements.trainingMenu,
      'sale': this.elements.saleMenu
    };
    
    cy.get(categoryMap[mainCategory.toLowerCase()]).trigger('mouseover');
    cy.contains('a', subCategory).click({ force: true });
    return this;
  }

  // Wait for page to be ready
  waitForPageLoad() {
    cy.get(this.elements.loadingMask).should('not.exist');
    cy.get(this.elements.loader).should('not.exist');
    cy.get('body').should('not.have.class', 'ajax-loading');
    return this;
  }

  // Message verification
  verifySuccessMessage(message) {
    cy.get(this.elements.successMessage)
      .should('be.visible')
      .and('contain', message);
    return this;
  }

  verifyErrorMessage(message) {
    cy.get(this.elements.errorMessage)
      .should('be.visible')
      .and('contain', message);
    return this;
  }
}

export default new HomePage();