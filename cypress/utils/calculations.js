/**
 * Utility functions for price calculations and validations
 */

export const PriceCalculator = {
  /**
   * Calculate subtotal for a single product
   * @param {number} price - Product price
   * @param {number} quantity - Product quantity
   * @returns {number} Subtotal
   */
  calculateSubtotal(price, quantity) {
    return parseFloat((price * quantity).toFixed(2));
  },

  /**
   * Calculate tax amount
   * @param {number} subtotal - Cart subtotal
   * @param {number} taxRate - Tax rate as decimal (e.g., 0.08875 for 8.875%)
   * @returns {number} Tax amount
   */
  calculateTax(subtotal, taxRate) {
    return parseFloat((subtotal * taxRate).toFixed(2));
  },

  /**
   * Calculate discount amount
   * @param {number} subtotal - Cart subtotal
   * @param {object} discount - Discount object with type and value
   * @returns {number} Discount amount
   */
  calculateDiscount(subtotal, discount) {
    if (discount.type === 'percentage') {
      return parseFloat((subtotal * (discount.value / 100)).toFixed(2));
    } else if (discount.type === 'fixed') {
      return Math.min(discount.value, subtotal);
    }
    return 0;
  },

  /**
   * Calculate final total
   * @param {number} subtotal - Cart subtotal
   * @param {number} tax - Tax amount
   * @param {number} shipping - Shipping cost
   * @param {number} discount - Discount amount
   * @returns {number} Final total
   */
  calculateTotal(subtotal, tax = 0, shipping = 0, discount = 0) {
    return parseFloat((subtotal + tax + shipping - discount).toFixed(2));
  },

  /**
   * Format price for display
   * @param {number} price - Price to format
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    return `$${price.toFixed(2)}`;
  },

  /**
   * Parse price from text
   * @param {string} priceText - Price text (e.g., "$29.99")
   * @returns {number} Parsed price
   */
  parsePrice(priceText) {
    return parseFloat(priceText.replace(/[$,]/g, ''));
  }
};

export const CartValidator = {
  /**
   * Validate cart item count
   * @param {number} expected - Expected item count
   * @param {number} actual - Actual item count
   * @returns {boolean} Validation result
   */
  validateItemCount(expected, actual) {
    return expected === actual;
  },

  /**
   * Validate price range
   * @param {number} price - Price to validate
   * @param {number} min - Minimum price
   * @param {number} max - Maximum price
   * @returns {boolean} Validation result
   */
  validatePriceRange(price, min, max) {
    return price >= min && price <= max;
  },

  /**
   * Validate cart totals
   * @param {object} actual - Actual cart totals
   * @param {object} expected - Expected cart totals
   * @param {number} tolerance - Acceptable difference (default 0.01)
   * @returns {object} Validation results
   */
  validateCartTotals(actual, expected, tolerance = 0.01) {
    const results = {
      isValid: true,
      errors: []
    };

    if (Math.abs(actual.subtotal - expected.subtotal) > tolerance) {
      results.isValid = false;
      results.errors.push(`Subtotal mismatch: expected ${expected.subtotal}, got ${actual.subtotal}`);
    }

    if (expected.tax !== undefined && Math.abs(actual.tax - expected.tax) > tolerance) {
      results.isValid = false;
      results.errors.push(`Tax mismatch: expected ${expected.tax}, got ${actual.tax}`);
    }

    if (expected.total !== undefined && Math.abs(actual.total - expected.total) > tolerance) {
      results.isValid = false;
      results.errors.push(`Total mismatch: expected ${expected.total}, got ${actual.total}`);
    }

    return results;
  }
};

export const TestDataGenerator = {
  /**
   * Generate random email
   * @returns {string} Random email
   */
  generateEmail() {
    const timestamp = Date.now();
    return `test.user.${timestamp}@example.com`;
  },

  /**
   * Generate random phone number
   * @returns {string} Random phone number
   */
  generatePhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const lineNumber = Math.floor(Math.random() * 9000) + 1000;
    return `${areaCode}-${prefix}-${lineNumber}`;
  },

  /**
   * Generate random quantity within range
   * @param {number} min - Minimum quantity
   * @param {number} max - Maximum quantity
   * @returns {number} Random quantity
   */
  generateQuantity(min = 1, max = 5) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};