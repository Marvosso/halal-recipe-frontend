/**
 * Frontend Recipe Conversion Engine using JSON Knowledge Base
 * Uses shared evaluateItem() from halalEngine.js for consistent evaluation
 */

import { evaluateItem, calculateConfidenceScore } from "./halalEngine";
import { FEATURES } from "./featureFlags";
import halalKnowledge from "../data/halal_knowledge.json";
import { formatIngredientName } from "./ingredientDisplay";

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
            
            // Ensure confidenceScore is passed through correctly
            const confidenceScore = engineResult.confidenceScore !== undefined 
              ? engineResult.confidenceScore 
              : (engineResult.confidencePercentage !== undefined 
                  ? engineResult.confidencePercentage 
                  : (engineResult.confidence !== undefined 
                      ? Math.round(engineResult.confidence * 100) 
                      : 50)); // Default to 50 if truly missing, not 0
            
            detected.push({
              ingredient_id: normalizedKey, // Internal ID (snake_case)
              ingredient: normalizedKey, // Keep for backward compatibility
              normalizedName: normalizedKey,
              matchedTerm: term, // Store the actual term that matched in the recipe text
              status: engineResult.status,
              replacement_id: replacementId, // Replacement ingredient ID
              replacement: replacementId, // Keep for backward compatibility (will be formatted in UI)
              alternatives: engineResult.alternatives || entry?.alternatives || [],
              notes: engineResult.notes || entry?.notes || "",
              severity: entry?.confidence_score_base === 0.1 ? "high" : 
                       entry?.confidence_score_base === 0.5 ? "medium" : "low",
              confidence: confidenceScore / 100, // 0-1 format for backward compatibility
              confidenceScore: confidenceScore, // PRIMARY: 0-100 format
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
  
  let convertedText = recipeText;
  
  detectedIngredients.forEach(item => {
    // Get ingredient ID (internal snake_case format)
    const ingredientId = item.ingredient_id || item.ingredient;
    const replacementId = item.replacement_id || item.replacement;
    
    // Skip if no replacement available
    if (!replacementId || replacementId === "Halal alternative needed" || replacementId.trim() === "") {
      return; // Skip this ingredient if no replacement
    }
    
    // Get formatted replacement name from display map
    const replacementDisplay = formatIngredientName(replacementId);
    
    // Create search patterns for the original ingredient (handle various formats)
    // Start with the actual term that was matched during detection
    const searchPatterns = item.matchedTerm ? [item.matchedTerm] : [];
    
    // Add normalized ingredient ID variations
    searchPatterns.push(
      ingredientId,
      ingredientId.replace(/_/g, " "),
      ingredientId.replace(/_/g, "-")
    );
    
    // Also check aliases from the knowledge entry
    if (item.hkmEntry?.aliases) {
      searchPatterns.push(...item.hkmEntry.aliases);
      item.hkmEntry.aliases.forEach(alias => {
        searchPatterns.push(alias.replace(/_/g, " "));
        searchPatterns.push(alias.replace(/_/g, "-"));
      });
    }
    
    // Remove duplicates and empty patterns
    const uniquePatterns = [...new Set(searchPatterns)].filter(p => p && p.trim() !== "");
    
    // Replace each pattern found in text
    uniquePatterns.forEach(pattern => {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use word boundary regex, but be flexible with punctuation (comma, period, etc.)
      const regex = new RegExp(`\\b${escapedPattern}\\b`, "gi");
      
      // Replace all occurrences
      let previousText = convertedText;
      convertedText = convertedText.replace(regex, (match) => {
        // Preserve original case
        if (match === match.toUpperCase()) {
          return replacementDisplay.toUpperCase();
        } else if (match[0] === match[0].toUpperCase()) {
          return replacementDisplay.charAt(0).toUpperCase() + replacementDisplay.slice(1);
        }
        return replacementDisplay;
      });
      
      // Debug: log if replacement occurred
      if (convertedText !== previousText) {
        console.log(`Replaced "${pattern}" with "${replacementDisplay}"`);
      }
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
  // Guard: If no ingredients evaluated, return null (not 0%)
  if (!detectedIngredients || detectedIngredients.length === 0) {
    return { score: null, confidence_type: hasSubstitutions ? "post_conversion" : "classification" };
  }
  
  const strictness = userPreferences.strictnessLevel || "standard";
  
  // Count ingredient outcomes
  let halalCount = 0;
  let haramCount = 0;
  let conditionalCount = 0;
  let unknownCount = 0;
  let totalEvaluated = detectedIngredients.length;
  
  // Use shared confidence scoring from halalEngine for each ingredient
  // Aggregate all ingredient confidence impacts and track statuses
  let aggregatedImpact = 0;
  let minBaseConfidence = 1.0; // Track worst case (lowest confidence)
  let hasAnyInheritance = false;
  
  for (const item of detectedIngredients) {
    const engineResult = item.engineResult || {};
    const impact = engineResult.confidenceImpact || item.confidenceImpact || 0;
    
    // Track ingredient status for counting
    const itemStatus = engineResult.status || item.status || "unknown";
    if (itemStatus === "halal") {
      halalCount++;
    } else if (itemStatus === "haram") {
      haramCount++;
    } else if (itemStatus === "conditional") {
      conditionalCount++;
    } else {
      unknownCount++;
    }
    
    // Track most severe status (lowest base confidence)
    const itemBaseConfidence = itemStatus === "haram" ? 0.0 :
                               itemStatus === "conditional" ? 0.6 :
                               itemStatus === "questionable" ? 0.5 :
                               itemStatus === "unknown" ? 0.4 : 1.0;
    
    if (itemBaseConfidence < minBaseConfidence) {
      minBaseConfidence = itemBaseConfidence;
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
  
  // Calculate base confidence based on ingredient outcomes
  // Weighted average: more haram/unknown = lower confidence
  const haramWeight = haramCount / totalEvaluated;
  const unknownWeight = unknownCount / totalEvaluated;
  const conditionalWeight = conditionalCount / totalEvaluated;
  const halalWeight = halalCount / totalEvaluated;
  
  // Base confidence: start from worst case, but improve based on halal ratio
  let effectiveBaseConfidence = minBaseConfidence;
  
  // Count replacements
  const withReplacement = detectedIngredients.filter(
    (item) => item.replacement_id && item.replacement_id.trim() !== "" && item.replacement_id !== "Halal alternative needed"
  ).length;
  const withoutReplacement = detectedIngredients.length - withReplacement;
  const replacementRatio = withReplacement / totalEvaluated;
  
  // If substitutions exist, boost confidence (replacements are positive)
  if (hasSubstitutions) {
    if (withReplacement > 0) {
      // When replacements exist, the negative impact is reduced/eliminated
      // Reduce aggregatedImpact proportionally to replacement ratio
      // If all items are replaced, eliminate the negative impact entirely
      const adjustedImpact = aggregatedImpact * (1 - replacementRatio);
      
      // Boost base confidence: if all haram items are replaced, confidence should be high
      // Scale from minBaseConfidence to 0.95 based on replacement ratio
      // When replacementRatio = 1.0 (all replaced), baseConfidence should be 0.95
      // When replacementRatio = 0.0 (none replaced), baseConfidence = minBaseConfidence
      effectiveBaseConfidence = minBaseConfidence + (replacementRatio * (0.95 - minBaseConfidence));
      
      // Calculate base score using adjusted impact (reduced negative impact for replaced items)
      baseScore = calculateConfidenceScore(
        effectiveBaseConfidence,
        adjustedImpact, // Use adjusted impact (reduced for replaced items)
        strictness,
        hasAnyInheritance
      );
      
      // Apply penalties for missing replacements
      if (withoutReplacement > 0) {
        // Missing replacement reduces confidence by 20% per missing item
        baseScore *= Math.pow(0.8, withoutReplacement);
      }
      
      // Boost for successful full replacement (all items replaced)
      if (replacementRatio === 1.0) {
        // All items successfully replaced - high confidence
        baseScore = Math.min(100, baseScore * 1.05); // Slight boost to reach 95-100%
      }
    } else {
      // No replacements but substitutions exist (shouldn't happen, but handle gracefully)
      effectiveBaseConfidence = Math.max(minBaseConfidence, 0.5);
      baseScore = calculateConfidenceScore(
        effectiveBaseConfidence,
        aggregatedImpact,
        strictness,
        hasAnyInheritance
      );
    }
  } else {
    // No substitutions: use weighted average based on ingredient statuses
    // Halal ingredients boost confidence, haram/unknown reduce it
    effectiveBaseConfidence = (halalWeight * 1.0) + 
                              (conditionalWeight * 0.6) + 
                              (unknownWeight * 0.4) + 
                              (haramWeight * 0.0);
    
    // Calculate base score using shared function
    baseScore = calculateConfidenceScore(
      effectiveBaseConfidence,
      aggregatedImpact,
      strictness,
      hasAnyInheritance
    );
  }
  
  // Additional inheritance penalty for recipes with multiple inherited ingredients
  const withInheritance = detectedIngredients.filter(
    (item) => item.engineResult?.inheritedFrom || item.inheritedFrom
  ).length;
  
  if (withInheritance > 1) {
    // Extra 5% penalty for multiple inheritance chains
    baseScore *= 0.95;
  }
  
  // Ensure score reflects successful replacements
  // If all ingredients are replaced, confidence should be high (80-100%)
  if (hasSubstitutions && replacementRatio === 1.0 && baseScore < 80) {
    // All items successfully replaced - ensure high confidence
    baseScore = Math.max(80, baseScore);
  }
  
  // Guard: Never return 0% unless truly 0 (all haram, no replacements)
  // If we have evaluated ingredients with replacements or halal items, minimum score should reflect that
  if (baseScore === 0 && totalEvaluated > 0) {
    if (halalCount > 0 || conditionalCount > 0) {
      // Has halal/conditional ingredients - score shouldn't be 0
      baseScore = Math.max(10, baseScore);
    } else if (hasSubstitutions && withReplacement > 0) {
      // Has substitutions with replacements - score shouldn't be 0
      baseScore = Math.max(20, baseScore);
    }
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
    
    // Debug: log detected ingredients
    console.log("[CONVERSION DEBUG] Detected ingredients:", detectedIngredients.map(i => ({
      ingredient: i.ingredient_id || i.ingredient,
      replacement: i.replacement_id || i.replacement,
      matchedTerm: i.matchedTerm
    })));
    
    // Step 2: Replace ingredients in text
    const convertedText = replaceIngredientsInText(trimmedText, detectedIngredients);
    const hasSubstitutions = convertedText !== trimmedText;
    
    // Debug: log if substitutions occurred
    if (!hasSubstitutions && detectedIngredients.length > 0) {
      console.warn("[CONVERSION DEBUG] Ingredients detected but no substitutions occurred");
    }
    
    // Step 3: Calculate confidence score with type (uses shared scoring from halalEngine)
    const confidenceResult = calculateRecipeConfidenceScore(detectedIngredients, userPreferences, hasSubstitutions);
    const confidenceScore = confidenceResult.score;
    const confidenceType = confidenceResult.confidence_type;
    
    // Step 4: Format issues for UI (using ingredient IDs)
    const issues = detectedIngredients.map((item) => {
      const references = [];
      if (item.quranReference) references.push(item.quranReference);
      if (item.hadithReference) references.push(item.hadithReference);
      
      // Ensure confidenceScore is passed through
      const issueConfidenceScore = item.confidenceScore !== undefined
        ? item.confidenceScore
        : (item.engineResult?.confidenceScore !== undefined
            ? item.engineResult.confidenceScore
            : (item.engineResult?.confidencePercentage !== undefined
                ? item.engineResult.confidencePercentage
                : (item.engineResult?.confidence !== undefined
                    ? Math.round(item.engineResult.confidence * 100)
                    : undefined)));
      
      return {
        ingredient_id: item.ingredient_id || item.ingredient, // Internal ID
        ingredient: item.ingredient_id || item.ingredient, // Keep for backward compatibility
        replacement_id: item.replacement_id || item.replacement, // Replacement ID
        replacement: item.replacement_id || item.replacement, // Keep for backward compatibility
        notes: item.notes,
        severity: item.severity,
        confidence: item.confidence,
        confidenceScore: issueConfidenceScore, // PRIMARY: 0-100 format
        quranReference: item.quranReference,
        hadithReference: item.hadithReference,
        references: references,
        // Add knowledge engine fields
        inheritedFrom: item.engineResult?.inheritedFrom,
        alternatives: item.alternatives,
        eli5: item.engineResult?.eli5 || item.engineResult?.simpleExplanation,
        simpleExplanation: item.engineResult?.simpleExplanation || item.engineResult?.eli5,
        explanation: item.engineResult?.explanation || item.notes,
        trace: item.engineResult?.trace || [],
        tags: item.engineResult?.tags,
        hkmResult: item.engineResult,
        validationState: item.engineResult?.enforcedBy === "user_preferences" ? "preference_based" :
                        item.engineResult?.inheritedFrom ? "derived_haram" : "explicit_haram",
        preferencesApplied: item.engineResult?.preferences
      };
    });
    
    // Guard: If confidenceScore is null (no ingredients evaluated), return null
    // Otherwise ensure it's a valid number
    const finalConfidenceScore = confidenceScore === null ? null : 
                                  (typeof confidenceScore === "number" && !isNaN(confidenceScore) ? confidenceScore : 0);
    
    return {
      originalText: trimmedText,
      convertedText: convertedText,
      issues: issues,
      confidenceScore: finalConfidenceScore,
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
      confidenceScore: null, // null indicates error, not 0%
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
