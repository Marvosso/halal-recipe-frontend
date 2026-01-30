/**
 * Premium Subscription Management
 * Handles subscription status, features, and limits
 */

const FREE_TIER_LIMITS = {
  // Recipe Conversion
  conversionsPerDay: Infinity, // Unlimited basic conversions
  batchConversion: false, // No batch conversion
  conversionHistory: false, // No history
  
  // Substitutions
  maxSubstitutions: 3, // Top 3 alternatives only
  advancedSubstitutionLogic: false, // Basic only
  substitutionQualityScores: false, // No scores
  customSubstitutionPreferences: false, // Standard only
  
  // Halal Verification
  brandLevelVerification: false, // Generic only
  scholarConsultation: false, // No access
  
  // Export & Sharing
  exportFormats: ['txt'], // Text only
  mealPlanningIntegration: false, // No integration
  shoppingListGeneration: false, // No shopping lists
  
  // Saved Recipes
  savedRecipes: 5, // Max 5 saved recipes
  recipeCollections: false, // No collections
  recipeSearch: false, // No search
  
  // Support
  prioritySupport: false, // Community only
  featureRequestPriority: false, // Community voting
  
  // Advanced Features
  nutritionalAnalysis: false, // No analysis
  recipeScaling: false, // No scaling
  ingredientSubstitutionHistory: false, // No history
  
  // Early Access
  earlyAccess: false, // Standard release
};

const PREMIUM_FEATURES = {
  // Recipe Conversion
  conversionsPerDay: Infinity, // Unlimited
  batchConversion: true, // Up to 10 recipes
  conversionHistory: true, // Full history with search
  
  // Substitutions
  maxSubstitutions: Infinity, // All alternatives
  advancedSubstitutionLogic: true, // Advanced algorithms
  substitutionQualityScores: true, // Flavor/texture scores
  customSubstitutionPreferences: true, // Save preferences
  
  // Halal Verification
  brandLevelVerification: true, // Brand-specific checks
  scholarConsultation: true, // Priority access
  
  // Export & Sharing
  exportFormats: ['txt', 'pdf', 'json'], // All formats
  mealPlanningIntegration: true, // Meal planning apps
  shoppingListGeneration: true, // Auto-generate lists
  
  // Saved Recipes
  savedRecipes: Infinity, // Unlimited
  recipeCollections: true, // Organize by cuisine
  recipeSearch: true, // Full search
  
  // Support
  prioritySupport: true, // 24-hour response
  featureRequestPriority: true, // Direct access
  
  // Advanced Features
  nutritionalAnalysis: true, // Halal-focused nutrition
  recipeScaling: true, // Scale by servings
  ingredientSubstitutionHistory: true, // Full history
  
  // Early Access
  earlyAccess: true, // Beta features
};

/**
 * Check if user has premium subscription
 * @returns {boolean}
 */
export function isPremiumUser() {
  // Check localStorage first (for offline/quick check)
  const premiumStatus = localStorage.getItem('premiumStatus');
  if (premiumStatus === 'active') {
    return true;
  }
  
  // Check user object if available
  if (typeof window !== 'undefined' && window.user) {
    return window.user.isPremium === true;
  }
  
  return false;
}

/**
 * Get user's conversion limit for today
 * @returns {number} - Remaining conversions today, or Infinity for premium
 */
export function getRemainingConversionsToday() {
  if (isPremiumUser()) {
    return Infinity;
  }
  
  const today = new Date().toDateString();
  const conversionsKey = `conversions_${today}`;
  const conversionsToday = parseInt(localStorage.getItem(conversionsKey) || '0', 10);
  
  return Math.max(0, FREE_TIER_LIMITS.conversionsPerDay - conversionsToday);
}

/**
 * Track a conversion (increment counter for free users)
 */
export function trackConversion() {
  if (isPremiumUser()) {
    return; // No limit for premium
  }
  
  const today = new Date().toDateString();
  const conversionsKey = `conversions_${today}`;
  const current = parseInt(localStorage.getItem(conversionsKey) || '0', 10);
  localStorage.setItem(conversionsKey, (current + 1).toString());
}

/**
 * Check if user can perform conversion
 * @returns {boolean}
 */
export function canConvert() {
  if (isPremiumUser()) {
    return true;
  }
  
  return getRemainingConversionsToday() > 0;
}

/**
 * Get feature availability
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export function hasFeature(feature) {
  if (isPremiumUser()) {
    return PREMIUM_FEATURES[feature] === true;
  }
  
  // Free tier features
  return FREE_TIER_LIMITS[feature] === true || 
         (typeof FREE_TIER_LIMITS[feature] === 'number' && FREE_TIER_LIMITS[feature] > 0);
}

/**
 * Check if user can use a specific feature
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export function canUseFeature(feature) {
  if (isPremiumUser()) {
    return PREMIUM_FEATURES[feature] === true;
  }
  
  // Check free tier limits
  const freeLimit = FREE_TIER_LIMITS[feature];
  
  if (freeLimit === true) {
    return true; // Available in free tier
  }
  
  if (freeLimit === false || freeLimit === 0) {
    return false; // Not available in free tier
  }
  
  if (typeof freeLimit === 'number') {
    return freeLimit > 0; // Has a limit (check usage separately)
  }
  
  return false;
}

/**
 * Get maximum substitutions allowed
 * @returns {number} - Max substitutions (Infinity for premium)
 */
export function getMaxSubstitutions() {
  if (isPremiumUser()) {
    return Infinity;
  }
  
  return FREE_TIER_LIMITS.maxSubstitutions || 3;
}

/**
 * Check if user can save more recipes
 * @param {number} currentCount - Current number of saved recipes
 * @returns {boolean}
 */
export function canSaveRecipe(currentCount) {
  if (isPremiumUser()) {
    return true; // Unlimited
  }
  
  return currentCount < FREE_TIER_LIMITS.savedRecipes;
}

/**
 * Check if user can use batch conversion
 * @returns {boolean}
 */
export function canUseBatchConversion() {
  if (isPremiumUser()) {
    return PREMIUM_FEATURES.batchConversion === true;
  }
  
  return FREE_TIER_LIMITS.batchConversion === true;
}

/**
 * Check if user can use brand-level verification
 * @returns {boolean}
 */
export function canUseBrandVerification() {
  if (isPremiumUser()) {
    return PREMIUM_FEATURES.brandLevelVerification === true;
  }
  
  return FREE_TIER_LIMITS.brandLevelVerification === true;
}

/**
 * Get saved recipes limit
 * @returns {number} - Max saved recipes, or Infinity for premium
 */
export function getSavedRecipesLimit() {
  if (isPremiumUser()) {
    return Infinity;
  }
  
  return FREE_TIER_LIMITS.savedRecipes;
}

/**
 * Check if user can save more recipes
 * @param {number} currentCount - Current number of saved recipes
 * @returns {boolean}
 */
export function canSaveRecipe(currentCount) {
  if (isPremiumUser()) {
    return true;
  }
  
  return currentCount < FREE_TIER_LIMITS.savedRecipes;
}

/**
 * Get available export formats
 * @returns {string[]}
 */
export function getAvailableExportFormats() {
  if (isPremiumUser()) {
    return PREMIUM_FEATURES.exportFormats;
  }
  
  return FREE_TIER_LIMITS.exportFormats;
}
