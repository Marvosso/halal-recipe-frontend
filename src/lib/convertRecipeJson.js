/**
 * Frontend Recipe Conversion Engine using JSON Knowledge Base
 * Replaces CSV-based system with hierarchical JSON knowledge engine
 */

import { evaluateItem } from "./halalEngine";
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
  ingredientLookup.forEach(({ mainKey, entry }, lookupKey) => {
    // Create search patterns: exact match, with underscores, with spaces
    const searchTerms = [
      lookupKey,
      lookupKey.replace(/_/g, " "),
      lookupKey.replace(/ /g, "_")
    ];
    
    for (const term of searchTerms) {
      // Use word boundary regex for accurate detection
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
            const displayName = term.replace(/_/g, " "); // Use matched term for display
            
            detected.push({
              ingredient: displayName,
              normalizedName: normalizedKey,
              status: engineResult.status,
              replacement: entry?.alternatives?.[0] || engineResult.alternatives?.[0] || "Halal alternative needed",
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
 */
function replaceIngredientsInText(recipeText, detectedIngredients) {
  if (!recipeText || typeof recipeText !== "string" || detectedIngredients.length === 0) {
    return recipeText;
  }
  
  let convertedText = recipeText;
  
  detectedIngredients.forEach(item => {
    const originalName = item.ingredient;
    const replacement = item.replacement || "Halal alternative";
    
    // Create word boundary regex for replacement
    const pattern = new RegExp(`\\b${originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    
    // Replace with highlighting for visibility
    convertedText = convertedText.replace(pattern, (match) => {
      // Preserve original case
      if (match === match.toUpperCase()) {
        return replacement.toUpperCase();
      } else if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  });
  
  return convertedText;
}

/**
 * Calculate confidence score based on detected ingredients and user preferences
 * Score rewards successful replacements and penalizes only when replacements are missing
 */
function calculateConfidenceScore(detectedIngredients, userPreferences = {}) {
  if (!detectedIngredients || detectedIngredients.length === 0) {
    return 100;
  }
  
  const strictness = userPreferences.strictnessLevel || "standard";
  const totalDetected = detectedIngredients.length;
  
  // Count ingredients WITH successful replacements
  const withReplacement = detectedIngredients.filter(
    (item) => item.replacement && item.replacement.trim() !== "" && item.replacement !== "Halal alternative needed"
  ).length;
  
  // Base score: percentage of ingredients with replacements (rewards successful replacements)
  let baseScore = (withReplacement / totalDetected) * 100;
  
  // If all ingredients have replacements, start at 100
  if (withReplacement === totalDetected) {
    baseScore = 100;
  }
  
  // Minor adjustments for risk factors (only small reductions since replacements exist)
  const withInheritance = detectedIngredients.filter(
    (item) => item.engineResult?.trace && item.engineResult.trace.length > 1
  ).length;
  
  // Small reduction for ingredients with complex inheritance chains (but less severe)
  if (withInheritance > 0) {
    // Reduce by 5-10% instead of 15% since replacements exist
    const inheritancePenalty = withInheritance === 1 ? 0.05 : 0.10;
    baseScore *= (1 - inheritancePenalty);
  }
  
  // Penalize only for ingredients WITHOUT replacements (this is the real issue)
  const withoutReplacement = totalDetected - withReplacement;
  if (withoutReplacement > 0) {
    // Each missing replacement reduces score by 15-25% depending on severity
    detectedIngredients.forEach(item => {
      if (!item.replacement || item.replacement.trim() === "" || item.replacement === "Halal alternative needed") {
        const missingPenalty = item.severity === "high" ? 0.25 : 
                              item.severity === "medium" ? 0.20 : 0.15;
        baseScore -= (baseScore * missingPenalty);
      }
    });
  }
  
  // Adjust for strictness level (minor adjustment)
  if (strictness === "strict") {
    baseScore *= 0.98; // Small reduction for strict mode (was 0.95)
  } else if (strictness === "flexible") {
    baseScore *= 1.01; // Slight increase for flexible (was 1.02, now more conservative)
  }
  
  return Math.max(0, Math.min(100, Math.round(baseScore)));
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
    
    // Step 3: Calculate confidence score
    const confidenceScore = calculateConfidenceScore(detectedIngredients, userPreferences);
    
    // Step 4: Format issues for UI
    const issues = detectedIngredients.map((item) => {
      const references = [];
      if (item.quranReference) references.push(item.quranReference);
      if (item.hadithReference) references.push(item.hadithReference);
      
      return {
        ingredient: item.ingredient,
        replacement: item.replacement,
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
