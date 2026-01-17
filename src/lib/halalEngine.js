import halalKnowledgeMain from "../data/halal_knowledge.json";
import halalKnowledgeLegacy from "../data/halalKnowledge.json";
// Keep old imports for backward compatibility
import ingredients from "../data/halal/ingredients.json";
import sources from "../data/halal/sources.json";
import products from "../data/halal/products.json";
import { HALAL_RULES } from "./halalRules";

// Merge all knowledge sources (new format takes priority)
const halalKnowledge = {
  ...halalKnowledgeLegacy,
  ...halalKnowledgeMain
};

const STATUS_SCORE = {
  halal: 1,
  conditional: 0.6,
  unknown: 0.4,
  haram: 0
};

export function evaluateItem(itemId, options = {}) {
  const trace = [];
  const visited = new Set(); // Prevent circular references
  let score = 1;
  let tags = [];
  let preferenceEnforced = false;
  let inheritedFrom = null;
  let alternatives = [];
  let references = [];
  let notes = "";
  let eli5 = "";

  // Helper function to resolve multi-level inheritance
  function resolveInheritance(id, path = []) {
    // Prevent circular references
    if (visited.has(id) || path.includes(id)) {
      return null;
    }
    visited.add(id);
    const newPath = [...path, id];

    // First, check new consolidated knowledge base
    let item = halalKnowledge[id];
    let fromNewBase = true;

    // Check aliases if direct lookup fails
    if (!item) {
      // Search through aliases
      for (const [key, value] of Object.entries(halalKnowledge)) {
        if (value.aliases && Array.isArray(value.aliases) && value.aliases.includes(id)) {
          item = value;
          fromNewBase = true;
          break;
        }
      }
    }

    // Fallback to old knowledge base if not found
    if (!item) {
      fromNewBase = false;
      item = ingredients[id] || products[id] || sources[id];
      
      // Convert old format to new format for compatibility
      if (item) {
        item = {
          status: item.default_status || item.status || "unknown",
          derivesFrom: item.contains || item.depends_on || item.inheritance || [],
          alternatives: item.alternatives || [],
          tags: item.tags || [],
          notes: item.reason || item.notes || "",
          eli5: item.eli5 || "",
          references: item.references || [],
          aliases: item.aliases || []
        };
      }
    }
    
    // Convert new format to internal format
    if (item && fromNewBase) {
      // Ensure derivesFrom exists (map from inheritance if needed)
      if (!item.derivesFrom && item.inheritance) {
        item.derivesFrom = item.inheritance;
      }
    }

    if (!item) {
      trace.push(`Unknown item: ${id}`);
      score = Math.min(score, STATUS_SCORE.unknown);
      return null;
    }

    // Update result with current item data
    if (item.status) {
      trace.push(`${id} is ${item.status}`);
      const currentScore = STATUS_SCORE[item.status] || STATUS_SCORE.unknown;
      score = Math.min(score, currentScore);
    }

    // Collect tags
    if (item.tags && Array.isArray(item.tags)) {
      tags.push(...item.tags);
    }

    // Collect alternatives
    if (item.alternatives && Array.isArray(item.alternatives)) {
      alternatives.push(...item.alternatives);
    }

    // Collect references
    if (item.references && Array.isArray(item.references)) {
      references.push(...item.references);
    }

    // Update notes and eli5 (prioritize most specific)
    if (item.notes) {
      notes = item.notes;
    }
    if (item.eli5) {
      eli5 = item.eli5;
    }

    // Recursively resolve derivesFrom/inheritance chain first (to find the root haram source)
    const inheritanceChain = item.derivesFrom || item.inheritance || [];
    if (inheritanceChain && Array.isArray(inheritanceChain) && inheritanceChain.length > 0) {
      for (const derivedId of inheritanceChain) {
        const normalizedDerivedId = typeof derivedId === "string" 
          ? derivedId.toLowerCase().trim().replace(/\s+/g, "_")
          : String(derivedId).toLowerCase().trim().replace(/\s+/g, "_");
        const derivedItem = resolveInheritance(normalizedDerivedId, newPath);
        // Track the first haram source found in the inheritance chain
        if (derivedItem && derivedItem.status === "haram" && !inheritedFrom) {
          inheritedFrom = normalizedDerivedId;
        }
      }
    }
    
    // If current item is haram but no inheritedFrom found yet, it's the source
    if (item.status === "haram" && !inheritedFrom) {
      inheritedFrom = id;
    }

    // Also check old format for compatibility
    if (!fromNewBase && item.contains && Array.isArray(item.contains) && item.contains.length > 0) {
      for (const childId of item.contains) {
        resolveInheritance(childId, newPath);
      }
    }

    return item;
  }

  // Resolve inheritance chain
  const rootItem = resolveInheritance(itemId);
  const baseStatus = rootItem?.status || "unknown";
  let adjustedStatus = baseStatus;
  let adjustedConfidence = Number(score.toFixed(2));

  // Infer tags from root item (after evaluation) if not already set
  if (rootItem && (!rootItem.tags || rootItem.tags.length === 0)) {
    // Infer tags based on item properties
    if (rootItem.category === "animal-derived" || itemId === "gelatin") {
      tags.push("gelatin_unknown");
    }
    if (itemId.includes("vanilla") || itemId.includes("extract")) {
      tags.push("alcohol_trace");
    }
    if (itemId.includes("shellfish") || itemId.includes("shrimp") || itemId.includes("lobster")) {
      tags.push("seafood_shellfish");
    }
  }

  // Apply preference-based rules (only if status is conditional/unknown)
  const prefs = options || {};
  const strictness = prefs.strictness || prefs.strictnessLevel || "standard";
  const madhab = prefs.madhab || prefs.schoolOfThought || "no-preference";

  if (baseStatus === "conditional" || baseStatus === "unknown") {
    // Apply strictness rules
    if (tags.includes("gelatin_unknown") && HALAL_RULES.strictness[strictness]?.gelatin_unknown) {
      const ruleStatus = HALAL_RULES.strictness[strictness].gelatin_unknown;
      if (ruleStatus !== "conditional") {
        adjustedStatus = ruleStatus === "questionable" ? "conditional" : ruleStatus;
        preferenceEnforced = true;
        // Map questionable back to conditional for consistency
        if (ruleStatus === "questionable") adjustedStatus = "conditional";
      }
    }

    if (tags.includes("alcohol_trace") && HALAL_RULES.strictness[strictness]?.alcohol_trace) {
      const ruleStatus = HALAL_RULES.strictness[strictness].alcohol_trace;
      if (ruleStatus !== "conditional") {
        adjustedStatus = ruleStatus === "questionable" ? "conditional" : ruleStatus;
        preferenceEnforced = true;
        if (ruleStatus === "questionable") adjustedStatus = "conditional";
      }
    }

    // Apply madhab rules (only if madhab is specified)
    if (madhab !== "no-preference" && tags.includes("seafood_shellfish") && HALAL_RULES.madhab[madhab]?.seafood_shellfish) {
      const ruleStatus = HALAL_RULES.madhab[madhab].seafood_shellfish;
      adjustedStatus = ruleStatus;
      preferenceEnforced = true;
    }
  }

  // Adjust confidence if preferences were enforced
  if (preferenceEnforced) {
    adjustedConfidence = Number((adjustedConfidence * 0.9).toFixed(2));
  }

  // Remove duplicate tags and alternatives
  const uniqueTags = [...new Set(tags)];
  const uniqueAlternatives = [...new Set(alternatives)];
  
  // Remove duplicate references
  const uniqueReferences = [...new Set(references)];

  const result = {
    status: adjustedStatus,
    confidence: adjustedConfidence,
    trace,
    eli5: eli5 || halalKnowledge[itemId]?.eli5 || ingredients[itemId]?.eli5 || products[itemId]?.eli5 || "",
    tags: uniqueTags.length > 0 ? uniqueTags : undefined,
    alternatives: uniqueAlternatives.length > 0 ? uniqueAlternatives : undefined,
    notes: notes || halalKnowledge[itemId]?.notes || undefined,
    references: uniqueReferences.length > 0 ? uniqueReferences : undefined,
    aliases: halalKnowledge[itemId]?.aliases || undefined
  };

  // Add inheritedFrom if status is haram or conditional due to inheritance
  if (inheritedFrom && (adjustedStatus === "haram" || (adjustedStatus === "conditional" && trace.length > 1))) {
    result.inheritedFrom = inheritedFrom;
  }

  if (preferenceEnforced) {
    result.enforcedBy = "user_preferences";
    result.preferences = {
      strictness,
      madhab: madhab !== "no-preference" ? madhab : undefined
    };
  }

  return result;
}
