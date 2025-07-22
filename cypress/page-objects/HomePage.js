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
      mainNav: '#store\\.menu',
      womenMenu: '#ui-id-4',
      menMenu: '#ui-id-5',
      gearMenu: '#ui-id-6',
      trainingMenu: '#ui-id-7',
      saleMenu: '#ui-id-8',
      
      // Product sections
      hotSellers: '.block-products-list',
      productItems: '.product-item',
      productImage: '.product-image-photo',
      productName: '.product-item-name',
      productPrice: '.price',
      addToCartButton: '.action.tocart'
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
    // Check if cart count element exists, return 0 if not found
    return cy.get('body').then($body => {
      if ($body.find(this.elements.miniCartCount).length > 0) {
        return cy.get(this.elements.miniCartCount).invoke('text').then(text => {
          const count = parseInt(text.trim());
          return isNaN(count) ? 0 : count;
        });
      } else {
        return cy.wrap(0);
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
}

export default new HomePage();