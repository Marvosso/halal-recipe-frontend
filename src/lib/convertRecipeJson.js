/**
 * Frontend Recipe Conversion Engine using JSON Knowledge Base
 * Uses shared evaluateItem() from halalEngine.js for consistent evaluation
 */

import { evaluateItem, calculateConfidenceScore } from "./halalEngine";
import { FEATURES } from "./featureFlags";
import halalKnowledge from "../data/halal_knowledge.json";

/**
 * Normalize ingredient name for lookup
 */
function normalizeIngredientName(name) {
  if (!name || typeof name !== "string") return "";
  return name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/**
 * Detect haram/conditional ingredients in recipe text using JSON knowledge base
 * Improved detection with word boundaries and alias matching
 */
function detectIngredientsInText(recipeText, userPreferences = {}) {
  if (!recipeText || typeof recipeText !== "string") return [];
  
  if (!halalKnowledge || typeof halalKnowledge !== "object" || Object.keys(halalKnowledge).length === 0) {
    console.warn("halalKnowledge not loaded or empty");
    return [];
  }
  
  const textLower = recipeText.toLowerCase();
  const detected = [];
  const processed = new Set(); // Track processed ingredients to avoid duplicates
  
  // Build lookup map: ingredient name -> entry
  const ingredientLookup = new Map();
  Object.entries(halalKnowledge).forEach(([key, value]) => {
    // Map main ingredient
    ingredientLookup.set(key, { mainKey: key, entry: value });
    
    // Map aliases to main ingredient
    if (value.aliases && Array.isArray(value.aliases)) {
      value.aliases.forEach(alias => {
        if (!ingredientLookup.has(alias)) {
          ingredientLookup.set(alias, { mainKey: key, entry: value });
        }
      });
    }
  });
  
  // Check each known ingredient and alias against recipe text
  ingredientLookup.forEach((value, lookupKey) => {
    const { mainKey, entry } = value;
    
    // Create search patterns: exact match, with underscores, with spaces
    const searchTerms = [
      lookupKey,
      lookupKey.replace(/_/g, " "),
      lookupKey.replace(/ /g, "_")
    ];
    
    for (const term of searchTerms) {
      // Use word boundary regex for accurate detection (case-insensitive)
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Create new regex for each test to avoid state issues
      const pattern = new RegExp(`\\b${escapedTerm}\\b`, "gi");
      
      if (pattern.test(recipeText)) {
        const normalizedKey = normalizeIngredientName(mainKey);
        
        // Only process each main ingredient once
        if (!processed.has(normalizedKey)) {
          processed.add(normalizedKey);
          
          // Evaluate ingredient using knowledge engine with preferences
          const engineResult = evaluateItem(normalizedKey, {
            madhab: userPreferences.schoolOfThought || "no-preference",
            strictness: userPreferences.strictnessLevel || "standard"
          });
          
          // Only add if ingredient is haram or conditional
          if (engineResult.status === "haram" || engineResult.status === "conditional") {
            // Get replacement ingredient ID (first alternative)
            const replacementId = entry?.alternatives?.[0] || engineResult.alternatives?.[0] || null;
            
            detected.push({
              ingredient_id: normalizedKey, // Internal ID (snake_case)
              ingredient: normalizedKey, // Keep for backward compatibility
              normalizedName: normalizedKey,
              status: engineResult.status,
              replacement_id: replacementId, // Replacement ingredient ID
              replacement: replacementId, // Keep for backward compatibility (will be formatted in UI)
              alternatives: engineResult.alternatives || entry?.alternatives || [],
              notes: engineResult.notes || entry?.notes || "",
              severity: entry?.confidence_score_base === 0.1 ? "high" : 
                       entry?.confidence_score_base === 0.5 ? "medium" : "low",
              confidence: engineResult.confidence || entry?.confidence_score_base || 0.5,
              quranReference: engineResult.references?.find(r => r.toLowerCase().includes("qur'an") || r.toLowerCase().includes("quran")) || "",
              hadithReference: engineResult.references?.find(r => r.toLowerCase().includes("hadith") || r.toLowerCase().includes("bukhari") || r.toLowerCase().includes("muslim")) || "",
              engineResult: engineResult,
              hkmEntry: entry
            });
          }
        }
        break; // Found match, move to next ingredient
      }
    }
  });
  
  return detected;
}

/**
 * Replace haram ingredients in recipe text with halal alternatives
 * Uses ingredient IDs and display mapping for replacements
 */
function replaceIngredientsInText(recipeText, detectedIngredients) {
  if (!recipeText || typeof recipeText !== "string" || detectedIngredients.length === 0) {
    return recipeText;
  }
  
  // Import display formatter (use require to avoid circular dependency issues)
  const { formatIngredientName } = require("./ingredientDisplay");
  
  let convertedText = recipeText;
  
  detectedIngredients.forEach(item => {
    // Get ingredient ID (internal snake_case format)
    const ingredientId = item.ingredient_id || item.ingredient;
    const replacementId = item.replacement_id || item.replacement;
    
    // Get formatted replacement name from display map
    const replacementDisplay = replacementId && replacementId !== "Halal alternative needed"
      ? formatIngredientName(replacementId)
      : "Halal alternative";
    
    // Create search patterns for the original ingredient (handle various formats)
    const searchPatterns = [
      ingredientId,
      ingredientId.replace(/_/g, " "),
      ingredientId.replace(/_/g, "-"),
    ];
    
    // Also check aliases from the knowledge entry
    if (item.hkmEntry?.aliases) {
      searchPatterns.push(...item.hkmEntry.aliases);
      item.hkmEntry.aliases.forEach(alias => {
        searchPatterns.push(alias.replace(/_/g, " "));
        searchPatterns.push(alias.replace(/_/g, "-"));
      });
    }
    
    // Replace each pattern found in text
    searchPatterns.forEach(pattern => {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedPattern}\\b`, "gi");
      
      convertedText = convertedText.replace(regex, (match) => {
        // Preserve original case
        if (match === match.toUpperCase()) {
          return replacementDisplay.toUpperCase();
        } else if (match[0] === match[0].toUpperCase()) {
          return replacementDisplay.charAt(0).toUpperCase() + replacementDisplay.slice(1);
        }
        return replacementDisplay;
      });
    });
  });
  
  return convertedText;
}

/**
 * Calculate confidence score based on detected ingredients and user preferences
 * Uses SHARED calculateConfidenceScore from halalEngine.js for consistency
 * Applies recipe-level penalties (missing replacements) on top of per-ingredient scores
 */
function calculateRecipeConfidenceScore(detectedIngredients, userPreferences = {}, hasSubstitutions = false) {
  if (!detectedIngredients || detectedIngredients.length === 0) {
    return { score: 100, confidence_type: hasSubstitutions ? "post_conversion" : "classification" };
  }
  
  const strictness = userPreferences.strictnessLevel || "standard";
  
  // Use shared confidence scoring from halalEngine for each ingredient
  // Aggregate all ingredient confidence impacts
  let aggregatedImpact = 0;
  let maxBaseConfidence = 1.0;
  let hasAnyInheritance = false;
  
  for (const item of detectedIngredients) {
    const engineResult = item.engineResult || {};
    const impact = engineResult.confidenceImpact || item.confidenceImpact || 0;
    
    // Track most severe status (lowest base confidence)
    const itemStatus = engineResult.status || item.status || "unknown";
    const itemBaseConfidence = itemStatus === "haram" ? 0.0 :
                               itemStatus === "conditional" ? 0.6 :
                               itemStatus === "questionable" ? 0.5 :
                               itemStatus === "unknown" ? 0.4 : 1.0;
    
    if (itemBaseConfidence < maxBaseConfidence) {
      maxBaseConfidence = itemBaseConfidence;
    }
    
    // Aggregate confidence impacts
    if (impact < 0) {
      aggregatedImpact += impact;
    }
    
    // Track inheritance
    if (engineResult.inheritedFrom || item.inheritedFrom) {
      hasAnyInheritance = true;
    }
  }
  
  // Use shared calculateConfidenceScore from halalEngine
  let baseScore = calculateConfidenceScore(
    maxBaseConfidence,
    aggregatedImpact,
    strictness,
    hasAnyInheritance
  );
  
  // Additional recipe-level penalties (post-conversion only)
  if (hasSubstitutions) {
    const withoutReplacement = detectedIngredients.filter(
      (item) => !item.replacement_id || item.replacement_id.trim() === "" || item.replacement_id === "Halal alternative needed"
    ).length;
    
    if (withoutReplacement > 0) {
      // Missing replacement is a critical issue: reduce by 25% per missing item
      baseScore *= Math.pow(0.75, withoutReplacement);
    }
  }
  
  // Additional inheritance penalty for recipes with multiple inherited ingredients
  const withInheritance = detectedIngredients.filter(
    (item) => item.engineResult?.inheritedFrom || item.inheritedFrom
  ).length;
  
  if (withInheritance > 1) {
    // Extra 5% penalty for multiple inheritance chains
    baseScore *= 0.95;
  }
  
  return {
    score: Math.max(0, Math.min(100, Math.round(baseScore))),
    confidence_type: hasSubstitutions ? "post_conversion" : "classification"
  };
}

/**
 * Main conversion function using JSON knowledge engine
 */
export function convertRecipeWithJson(recipeText, userPreferences = {}) {
  // Defensive checks
  if (!recipeText || typeof recipeText !== "string") {
    return {
      originalText: "",
      convertedText: "",
      issues: [],
      confidenceScore: 0,
    };
  }
  
  const trimmedText = recipeText.trim();
  if (trimmedText === "") {
    return {
      originalText: "",
      convertedText: "",
      issues: [],
      confidenceScore: 0,
    };
  }
  
  try {
    // Step 1: Detect haram/conditional ingredients using JSON knowledge base
    const detectedIngredients = detectIngredientsInText(trimmedText, userPreferences);
    
    // Step 2: Replace ingredients in text
    const convertedText = replaceIngredientsInText(trimmedText, detectedIngredients);
    const hasSubstitutions = convertedText !== trimmedText;
    
    // Step 3: Calculate confidence score with type (uses shared scoring from halalEngine)
    const confidenceResult = calculateRecipeConfidenceScore(detectedIngredients, userPreferences, hasSubstitutions);
    const confidenceScore = confidenceResult.score;
    const confidenceType = confidenceResult.confidence_type;
    
    // Step 4: Format issues for UI (using ingredient IDs)
    const issues = detectedIngredients.map((item) => {
      const references = [];
      if (item.quranReference) references.push(item.quranReference);
      if (item.hadithReference) references.push(item.hadithReference);
      
      return {
        ingredient_id: item.ingredient_id || item.ingredient, // Internal ID
        ingredient: item.ingredient_id || item.ingredient, // Keep for backward compatibility
        replacement_id: item.replacement_id || item.replacement, // Replacement ID
        replacement: item.replacement_id || item.replacement, // Keep for backward compatibility
        notes: item.notes,
        severity: item.severity,
        confidence: item.confidence,
        quranReference: item.quranReference,
        hadithReference: item.hadithReference,
        references: references,
        // Add knowledge engine fields
        inheritedFrom: item.engineResult?.inheritedFrom,
        alternatives: item.alternatives,
        eli5: item.engineResult?.eli5,
        trace: item.engineResult?.trace || [],
        tags: item.engineResult?.tags,
        hkmResult: item.engineResult,
        validationState: item.engineResult?.enforcedBy === "user_preferences" ? "preference_based" :
                        item.engineResult?.inheritedFrom ? "derived_haram" : "explicit_haram",
        preferencesApplied: item.engineResult?.preferences
      };
    });
    
    return {
      originalText: trimmedText,
      convertedText: convertedText,
      issues: issues,
      confidenceScore: confidenceScore,
      confidence_type: confidenceType, // "classification" or "post_conversion"
      source: "json_engine" // Mark as JSON-based conversion
    };
  } catch (error) {
    console.error("Error in convertRecipeWithJson:", error);
    // Return safe fallback on error
    return {
      originalText: trimmedText,
      convertedText: trimmedText,
      issues: [],
      confidenceScore: 0,
      error: error.message
    };
  }
}

/**
 * Check if ingredient exists in knowledge base
 */
export function isIngredientKnown(ingredientName) {
  const normalized = normalizeIngredientName(ingredientName);
  return !!halalKnowledge[normalized];
}

/**
 * Get ingredient details from knowledge base
 */
export function getIngredientDetails(ingredientName, userPreferences = {}) {
  const normalized = normalizeIngredientName(ingredientName);
  const engineResult = evaluateItem(normalized, {
    madhab: userPreferences.schoolOfThought || "no-preference",
    strictness: userPreferences.strictnessLevel || "standard"
  });
  
  return engineResult;
}
