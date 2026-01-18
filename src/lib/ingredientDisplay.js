/**
 * Ingredient Display Utility
 * Maps internal ingredient IDs to user-friendly display names
 * Handles formatting (removes snake_case, capitalizes, etc.)
 * Uses nested/flat structure displayName when available
 */

import displayMap from "../data/ingredient_display_map.json";
import halalKnowledgeFlat from "../data/halal_knowledge_flat.json";
import nestedIngredients from "../data/nested_ingredients.json";

/**
 * Format ingredient ID to display name
 * Priority: nested/flat displayName > displayMap > formatted ID
 */
export function formatIngredientName(ingredientId) {
  if (!ingredientId || typeof ingredientId !== "string") {
    return "Unknown Ingredient";
  }

  const normalizedId = ingredientId.toLowerCase().trim();
  
  // Try nested structure first
  const nestedIng = nestedIngredients[normalizedId];
  if (nestedIng?.displayName) {
    return nestedIng.displayName;
  }
  
  // Try flat structure
  const flatIng = halalKnowledgeFlat[normalizedId];
  if (flatIng?.displayName) {
    return flatIng.displayName;
  }
  
  // Check display map
  if (displayMap[normalizedId]) {
    return displayMap[normalizedId];
  }

  // Fallback: format the ID itself
  return formatIngredientId(ingredientId);
}

/**
 * Format ingredient ID (fallback when not in display map)
 * Converts snake_case to Title Case
 */
export function formatIngredientId(ingredientId) {
  if (!ingredientId || typeof ingredientId !== "string") {
    return "Unknown Ingredient";
  }

  // Replace underscores with spaces
  let formatted = ingredientId.replace(/_/g, " ");
  
  // Capitalize first letter of each word
  formatted = formatted
    .split(" ")
    .map(word => {
      if (word.length === 0) return word;
      // Handle special cases (e.g., "halal" should be "Halal")
      if (word.toLowerCase() === "halal") return "Halal";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return formatted;
}

/**
 * Format multiple ingredient IDs
 */
export function formatIngredientNames(ingredientIds) {
  if (!Array.isArray(ingredientIds)) {
    return [];
  }
  return ingredientIds.map(id => formatIngredientName(id));
}

/**
 * Get display name for ingredient (with fallback)
 */
export function getIngredientDisplayName(ingredientId, fallback = null) {
  const displayName = formatIngredientName(ingredientId);
  if (displayName === "Unknown Ingredient" && fallback) {
    return formatIngredientId(fallback);
  }
  return displayName;
}
