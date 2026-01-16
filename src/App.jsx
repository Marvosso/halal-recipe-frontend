import React, { useState, useEffect } from "react";
import "./App.css";
import { getAxiosInstance } from "./api/axiosConfig";
import halalArabicImage from "./assets/halal-arabic.png";
import halalInputIcon from "./assets/halal-input.png";
import halalOutputIcon from "./assets/halal-output.png";
import halalSavedIcon from "./assets/halal-saved.png";
import { RefreshCw, ClipboardCopy, Download, Bookmark, Star, ThumbsUp, ThumbsDown, Play, Share2 } from "lucide-react";
import HaramIngredient from "./components/HaramIngredient";
import SimpleExplanationToggle from "./components/SimpleExplanationToggle";
import QuickLookup from "./components/QuickLookup";
import HalalStandardPanel from "./components/HalalStandardPanel";
import CommunityTips from "./components/CommunityTips";
import LanguageSwitcher from "./components/LanguageSwitcher";
import TabNavigation from "./components/TabNavigation";
import SocialFeed from "./components/SocialFeed";
import UserProfile from "./components/UserProfile";
import CreatePostModal from "./components/CreatePostModal";
import { t } from "./lib/i18n";
import { useAnalytics } from "./hooks/useAnalytics";
import logger from "./utils/logger";

function App() {
  const analytics = useAnalytics();
  const [recipe, setRecipe] = useState("");
  const [converted, setConverted] = useState("");
  const [issues, setIssues] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState("");
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [openIngredientCards, setOpenIngredientCards] = useState(new Set());
  const [openReferences, setOpenReferences] = useState(new Set());
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [publicRecipes, setPublicRecipes] = useState([]);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [simpleExplanationEnabled, setSimpleExplanationEnabled] = useState(false);
  const [halalSettings, setHalalSettings] = useState({
    strictnessLevel: "standard",
    schoolOfThought: "no-preference"
  });
  const [activeTab, setActiveTab] = useState("convert");
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showCachedResult, setShowCachedResult] = useState(false);
  
  // Form state for recipe submission
  const [formData, setFormData] = useState({
    title: "",
    ingredients: "",
    instructions: "",
    notes: "",
    isPublic: false,
  });
  const [showForm, setShowForm] = useState(false);

  // Load saved recipes and preferences from localStorage on mount
  useEffect(() => {
    try {
      if (typeof Storage !== "undefined") {
        const saved = localStorage.getItem("halalRecipes");
        const publicRecipesData = localStorage.getItem("halalPublicRecipes");
        const simpleExplanation = localStorage.getItem("simpleExplanationEnabled");
        const strictness = localStorage.getItem("halalStrictnessLevel");
        const school = localStorage.getItem("halalSchoolOfThought");
        
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setSavedRecipes(parsed);
          }
        }
        
        if (publicRecipesData) {
          const parsed = JSON.parse(publicRecipesData);
          if (Array.isArray(parsed)) {
            setPublicRecipes(parsed);
          }
        }

        if (simpleExplanation === "true") {
          setSimpleExplanationEnabled(true);
        }

        if (strictness) {
          setHalalSettings(prev => ({ ...prev, strictnessLevel: strictness }));
        }

        if (school) {
          setHalalSettings(prev => ({ ...prev, schoolOfThought: school }));
        }
      }
    } catch (err) {
      logger.error("Error loading saved recipes:", err);
    }
    
    // Track initial page view
    analytics.trackPageView(activeTab);
  }, []);

  // Handle mobile tap to show/hide tooltips
  useEffect(() => {
    if (converted) {
      const recipePre = document.querySelector(".recipe-card pre");
      if (recipePre) {
        const handleTouchStart = (e) => {
          const target = e.target;
          if (target.classList.contains("haram-tooltip")) {
            // Toggle tooltip on mobile tap
            target.classList.toggle("tooltip-active");
            // Close other tooltips
            document.querySelectorAll(".haram-tooltip.tooltip-active").forEach((el) => {
              if (el !== target) {
                el.classList.remove("tooltip-active");
              }
            });
          }
        };

        const handleClickOutside = (e) => {
          if (!e.target.closest(".haram-tooltip")) {
            document.querySelectorAll(".haram-tooltip.tooltip-active").forEach((el) => {
              el.classList.remove("tooltip-active");
            });
          }
        };

        recipePre.addEventListener("touchstart", handleTouchStart, { passive: true });
        document.addEventListener("click", handleClickOutside);

        return () => {
          recipePre.removeEventListener("touchstart", handleTouchStart);
          document.removeEventListener("click", handleClickOutside);
        };
      }
    }
  }, [converted]);

  const handleConvert = async (recipeText = null, isAutoConvert = false) => {
    // Determine which recipe text to use
    // If recipeText is provided (from saved recipe), use it
    // Otherwise, use the current recipe state
    const recipeToConvert = recipeText !== null && recipeText !== undefined 
      ? recipeText 
      : recipe;
    
    // Defensive validation - only alert if truly empty and manual conversion
    if (recipeToConvert === null || recipeToConvert === undefined) {
      if (!isAutoConvert) {
        alert("Please enter a recipe to convert.");
      }
      return;
    }

    // Convert to string if not already
    const recipeString = typeof recipeToConvert === "string" 
      ? recipeToConvert 
      : String(recipeToConvert || "");

    // Trim and check if empty
    const trimmedRecipe = recipeString.trim();
    
    if (trimmedRecipe === "") {
      if (!isAutoConvert) {
        alert("Please enter a recipe to convert.");
      }
      return;
    }

    // Clear any previous errors
    setError("");
    setIsOffline(false);
    setShowCachedResult(false);
    
    try {
      const api = await getAxiosInstance();
      const res = await api.post("/convert", { recipe: trimmedRecipe });
      
      // Check if the response contains an error
      if (res.data?.error) {
        setError(res.data.error);
        setConverted("");
        setIssues([]);
        setConfidence(0);
        setIsAccordionOpen(false);
        setOpenIngredientCards(new Set());
        return;
      }
      
      // Update state with response data
      const convertedText = res.data?.convertedText || "";
      const convertedIssues = Array.isArray(res.data?.issues) ? res.data.issues : [];
      const convertedConfidence = typeof res.data?.confidenceScore === "number" ? res.data.confidenceScore : 0;
      
      setConverted(convertedText);
      setIssues(convertedIssues);
      setConfidence(convertedConfidence);
      
      // Cache successful conversion
      try {
        const cacheData = {
          recipe: trimmedRecipe,
          converted: convertedText,
          issues: convertedIssues,
          confidence: convertedConfidence,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("lastConversionCache", JSON.stringify(cacheData));
      } catch (cacheErr) {
        logger.warn("Failed to cache conversion:", cacheErr);
      }
      
      // Track conversion
      analytics.trackConversion({
        hasIssues: convertedIssues.length > 0,
        confidenceScore: convertedConfidence,
      });
      
      // Reset accordion state when new conversion happens
      setIsAccordionOpen(false);
      setOpenIngredientCards(new Set());
      
      // Only reset viewingRecipe if this is a manual conversion
      if (!isAutoConvert) {
        setViewingRecipe(null);
      }
    } catch (err) {
      logger.error("Conversion error:", err);
      
      // Determine error message based on error type
      let errorMessage = "Unable to connect to the server. Please check your internet connection.";
      let isNetworkError = false;
      
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
      } else if (err.request || err.code === "ECONNREFUSED" || err.message?.includes("Network Error")) {
        // Request was made but no response received (network error)
        isNetworkError = true;
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        
        // Check for cached result
        try {
          const cached = localStorage.getItem("lastConversionCache");
          if (cached) {
            const cacheData = JSON.parse(cached);
            // Only show cached if it's recent (within 24 hours)
            const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
            if (cacheAge < 24 * 60 * 60 * 1000) {
              setIsOffline(true);
              setShowCachedResult(true);
              setConverted(cacheData.converted);
              setIssues(cacheData.issues || []);
              setConfidence(cacheData.confidence || 0);
              errorMessage = "You're offline. Showing your last successful conversion. Please reconnect to convert a new recipe.";
            }
          }
        } catch (cacheErr) {
          logger.warn("Failed to load cached conversion:", cacheErr);
        }
      } else if (err.message) {
        // Something else happened
        errorMessage = err.message;
      }
      
      // Set error state
      setError(errorMessage);
      
      // Only clear converted recipe if we don't have a cached result
      if (!showCachedResult) {
        setConverted("");
        setIssues([]);
        setConfidence(0);
      }
      
      setIsAccordionOpen(false);
      setOpenIngredientCards(new Set());
    }
  };

  const copyToClipboard = () => {
    const textToCopy = converted || "";
    if (!textToCopy) {
      alert("No converted recipe to copy.");
      return;
    }
    navigator.clipboard.writeText(textToCopy);
    alert("Converted recipe copied to clipboard!");
  };

  const downloadRecipe = () => {
    const textToDownload = converted || "";
    if (!textToDownload) {
      alert("No converted recipe to download.");
      return;
    }
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted_recipe.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveRecipe = () => {
    const originalText = recipe || "";
    const convertedText = converted || "";
    
    if (!originalText || !convertedText) {
      alert("No recipe to save. Please convert a recipe first.");
      return;
    }

    try {
      if (typeof Storage !== "undefined") {
        const newRecipe = {
          id: Date.now().toString(),
          original: originalText,
          converted: convertedText,
          savedAt: new Date().toISOString(),
          isPublic: false,
        };

        const updated = [...savedRecipes, newRecipe];
        setSavedRecipes(updated);
        localStorage.setItem("halalRecipes", JSON.stringify(updated));
        alert("Recipe saved successfully!");
      } else {
        alert("LocalStorage is not available in your browser.");
      }
    } catch (err) {
      logger.error("Error saving recipe:", err);
      alert("Error saving recipe. Please try again.");
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    const { title, ingredients, instructions, notes, isPublic } = formData;
    
    if (!title || !ingredients || !instructions) {
      alert("Please fill in at least title, ingredients, and instructions.");
      return;
    }

    try {
      if (typeof Storage !== "undefined") {
        const newRecipe = {
          id: Date.now().toString(),
          title: title.trim(),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
          notes: notes.trim() || "",
          savedAt: new Date().toISOString(),
          isPublic: isPublic || false,
        };

        if (isPublic) {
          const updated = [...publicRecipes, newRecipe];
          setPublicRecipes(updated);
          localStorage.setItem("halalPublicRecipes", JSON.stringify(updated));
        } else {
          const updated = [...savedRecipes, newRecipe];
          setSavedRecipes(updated);
          localStorage.setItem("halalRecipes", JSON.stringify(updated));
        }

        // Reset form
        setFormData({
          title: "",
          ingredients: "",
          instructions: "",
          notes: "",
          isPublic: false,
        });
        setShowForm(false);
        alert(`Recipe ${isPublic ? "published" : "saved"} successfully!`);
      } else {
        alert("LocalStorage is not available in your browser.");
      }
    } catch (err) {
      logger.error("Error submitting recipe:", err);
      alert("Error submitting recipe. Please try again.");
    }
  };

  const loadSavedRecipe = async (savedRecipe) => {
    // Defensive checks
    if (!savedRecipe || typeof savedRecipe !== "object") {
      alert("Invalid recipe data.");
      return;
    }

    let recipeText = "";

    // Handle both old format (original/converted) and new format (title/ingredients/instructions)
    if (savedRecipe.original && typeof savedRecipe.original === "string") {
      // Old format: use original text for conversion
      recipeText = savedRecipe.original.trim();
    } else if (
      savedRecipe.ingredients &&
      typeof savedRecipe.ingredients === "string" &&
      savedRecipe.instructions &&
      typeof savedRecipe.instructions === "string"
    ) {
      // New format: combine into recipe text
      const title = savedRecipe.title && typeof savedRecipe.title === "string" 
        ? savedRecipe.title.trim() 
        : "";
      const ingredients = savedRecipe.ingredients.trim();
      const instructions = savedRecipe.instructions.trim();
      const notes = savedRecipe.notes && typeof savedRecipe.notes === "string"
        ? savedRecipe.notes.trim()
        : "";
      
      recipeText = `${title ? `${title}\n\n` : ""}Ingredients:\n${ingredients}\n\nInstructions:\n${instructions}${notes ? `\n\nNotes:\n${notes}` : ""}`;
    } else {
      alert("Invalid recipe format. Recipe data is missing required fields.");
      return;
    }

    // Validate that we have recipe text
    if (!recipeText || recipeText.trim() === "") {
      alert("Recipe text is empty. Cannot load recipe.");
      return;
    }

    // Set recipe state first to update the input field
    setRecipe(recipeText);

    // Set viewing recipe ID
    setViewingRecipe(savedRecipe.id || null);
    
    // Automatically trigger conversion with the recipe text
    // Pass isAutoConvert=true to prevent alert from showing
    await handleConvert(recipeText, true);
    
    // Scroll to top to show the loaded recipe
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSavedRecipe = (id, isPublic = false) => {
    if (!id) return;

    try {
      if (typeof Storage !== "undefined") {
        if (isPublic) {
          const updated = publicRecipes.filter((r) => r?.id !== id);
          setPublicRecipes(updated);
          localStorage.setItem("halalPublicRecipes", JSON.stringify(updated));
        } else {
          const updated = savedRecipes.filter((r) => r?.id !== id);
          setSavedRecipes(updated);
          localStorage.setItem("halalRecipes", JSON.stringify(updated));
        }
        
        // If viewing the deleted recipe, clear the view
        if (viewingRecipe === id) {
          setViewingRecipe(null);
          setRecipe("");
          setConverted("");
          setIssues([]);
          setConfidence(0);
        }
      }
    } catch (err) {
      logger.error("Error deleting recipe:", err);
      alert("Error deleting recipe. Please try again.");
    }
  };

  const highlightHaram = (text) => {
    if (!text || typeof text !== "string") {
      return [text];
    }
    if (!Array.isArray(issues) || issues.length === 0) {
      return [text];
    }

    // Create a map of haram ingredients (case insensitive)
    const haramList = new Map();
    issues.forEach((issue) => {
      const ingredient = issue?.ingredient;
      if (ingredient && typeof ingredient === "string") {
        const key = ingredient.toLowerCase();
        haramList.set(key, {
          name: ingredient,
          quranRef: issue?.quranReference || "",
          hadithRef: issue?.hadithReference || "",
        });
      }
    });

    // Process text word by word using regex to find word boundaries
    const elements = [];
    let lastIndex = 0;
    let keyIndex = 0;

    // Create a regex pattern for all haram ingredients
    const haramPatterns = Array.from(haramList.keys()).map(key => 
      key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    if (haramPatterns.length === 0) {
      return [text];
    }

    // Match all haram ingredients with word boundaries
    const regex = new RegExp(`\\b(${haramPatterns.join('|')})\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }

      // Add the haram ingredient component
      const matchedWord = match[0].toLowerCase();
      const haramData = haramList.get(matchedWord);
      if (haramData) {
        elements.push(
          <HaramIngredient
            key={`haram-${keyIndex++}-${match.index}`}
            name={haramData.name}
            quranRef={haramData.quranRef}
            hadithRef={haramData.hadithRef}
            useSimpleExplanation={simpleExplanationEnabled}
          />
        );
      } else {
        // Fallback: add as text if data not found
        elements.push(match[0]);
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    // If no matches found, return original text
    if (elements.length === 0) {
      return [text];
    }

    return elements;
  };

  const handleQuickLookupConvert = (ingredient) => {
    // Track quick lookup usage
    analytics.trackQuickLookup(ingredient);
    setRecipe(ingredient);
    // Optionally auto-convert
    setTimeout(() => {
      handleConvert(ingredient, false);
    }, 100);
  };

  const handleDemoRecipe = () => {
    const demoRecipe = `Chicken Carbonara

Ingredients:
- 500g pasta
- 200g bacon, diced
- 2 cloves garlic
- 1 cup white wine
- 1 cup heavy cream
- 100g parmesan cheese
- 2 eggs
- Salt and pepper to taste

Instructions:
1. Cook pasta according to package directions.
2. In a large pan, cook bacon until crispy.
3. Add garlic and cook for 1 minute.
4. Deglaze with white wine.
5. Add cream and bring to a simmer.
6. Toss with cooked pasta.
7. Add beaten eggs and parmesan.
8. Season with salt and pepper.`;
    
    setRecipe(demoRecipe);
    setTimeout(() => {
      handleConvert(demoRecipe, false);
    }, 100);
  };

  const handleFeedback = (isPositive) => {
    // Analytics event
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "feedback", {
        value: isPositive ? "positive" : "negative",
        conversion_id: viewingRecipe || "new"
      });
    }
    alert(isPositive ? "Thank you for your positive feedback!" : "Thank you for your feedback. We'll work to improve!");
  };

  const adjustConfidenceScore = (baseScore) => {
    // Adjust confidence based on halal settings
    let adjustedScore = baseScore;
    
    if (halalSettings.strictnessLevel === "strict") {
      // Reduce score for strict mode (more conservative)
      adjustedScore = Math.max(0, adjustedScore - 5);
    } else if (halalSettings.strictnessLevel === "flexible") {
      // Increase score for flexible mode (more lenient)
      adjustedScore = Math.min(100, adjustedScore + 5);
    }
    
    return adjustedScore;
  };

  const handleShareToCommunity = () => {
    if (!converted) {
      alert("Please convert a recipe first before sharing!");
      return;
    }
    setShowCreatePostModal(true);
  };

  const handlePostCreated = (post) => {
    try {
      const existingPosts = JSON.parse(localStorage.getItem("halalKitchenPosts") || "[]");
      const updatedPosts = [post, ...existingPosts];
      localStorage.setItem("halalKitchenPosts", JSON.stringify(updatedPosts));
      
      // Update stats
      const currentConverted = parseInt(localStorage.getItem("userRecipesConverted") || "0");
      localStorage.setItem("userRecipesConverted", (currentConverted + 1).toString());
      
      // Switch to feed tab to see the new post
      setActiveTab("feed");
      setShowCreatePostModal(false);
      
      // Scroll to top of feed
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      logger.error("Error saving post:", error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Track tab/page changes
    analytics.trackPageView(tab);
    
    if (tab === "create") {
      // If user has a converted recipe, open create modal
      if (converted) {
        setShowCreatePostModal(true);
      } else {
        // Otherwise, switch to convert tab
        setActiveTab("convert");
        alert("Please convert a recipe first before sharing!");
      }
    }
  };

  const toggleAccordion = () => {
    setIsAccordionOpen((prev) => !prev);
  };

  const toggleIngredientCard = (ingredientName) => {
    setOpenIngredientCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName);
      } else {
        newSet.add(ingredientName);
      }
      return newSet;
    });
  };

  const toggleReferences = (ingredientName) => {
    setOpenReferences((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName);
      } else {
        newSet.add(ingredientName);
      }
      return newSet;
    });
  };

  const safeConverted = typeof converted === "string" ? converted : "";
  const safeConfidence = typeof confidence === "number" && !isNaN(confidence) ? confidence : 0;
  const safeIssues = Array.isArray(issues) ? issues : [];
  const safeSavedRecipes = Array.isArray(savedRecipes) ? savedRecipes : [];
  const safePublicRecipes = Array.isArray(publicRecipes) ? publicRecipes : [];

  const renderRecipeCard = (recipeItem, isPublic = false) => {
    if (!recipeItem || !recipeItem.id) return null;
    
    const savedDate = recipeItem.savedAt 
      ? new Date(recipeItem.savedAt).toLocaleDateString()
      : "Unknown date";
    
    // Handle both old and new formats
    let title = recipeItem.title || "Untitled Recipe";
    let preview = "";
    
    if (recipeItem.converted && typeof recipeItem.converted === "string") {
      // Old format
      preview = recipeItem.converted.length > 100 
        ? recipeItem.converted.substring(0, 100) + "..." 
        : recipeItem.converted;
    } else if (recipeItem.ingredients && typeof recipeItem.ingredients === "string") {
      // New format
      preview = recipeItem.ingredients.length > 100 
        ? recipeItem.ingredients.substring(0, 100) + "..." 
        : recipeItem.ingredients;
    } else {
      preview = "No preview available";
    }

    return (
      <div 
        key={recipeItem.id} 
        className={`saved-recipe-item ${viewingRecipe === recipeItem.id ? "active" : ""}`}
      >
        <div 
          className="saved-recipe-content"
          onClick={() => loadSavedRecipe(recipeItem)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              loadSavedRecipe(recipeItem);
            }
          }}
        >
          <div className="saved-recipe-preview">
            <strong>{title}</strong>
            <span className="recipe-date">{savedDate}</span>
            <p>{preview}</p>
          </div>
        </div>
        <button
          className="delete-recipe-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Are you sure you want to delete this recipe?")) {
              deleteSavedRecipe(recipeItem.id, isPublic);
            }
          }}
          aria-label="Delete recipe"
        >
          Delete
        </button>
      </div>
    );
  };

  return (
    <div className="app">
      {activeTab === "convert" && (
        <div className="header-section">
          <div className="header-top">
            <img src={halalArabicImage} alt="Halal" className="halal-arabic" />
            <div className="header-actions">
              <HalalStandardPanel onSettingsChange={setHalalSettings} />
              <LanguageSwitcher />
            </div>
          </div>
          <h1>{t("halalKitchen")}</h1>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "convert" && (
          <>
            <QuickLookup onConvertClick={handleQuickLookupConvert} />
            
            <div className="form-toggle-section">
              <button 
                className="toggle-form-btn"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? t("hideRecipeForm") : t("submitNewRecipe")}
              </button>
            </div>

            {showForm && (
              <div className="recipe-form-section">
                <h2>Submit Recipe</h2>
                <form onSubmit={handleFormSubmit} className="recipe-form">
                  <div className="form-group">
                    <label htmlFor="title">Title *</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter recipe title"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ingredients">Ingredients *</label>
                    <textarea
                      id="ingredients"
                      name="ingredients"
                      value={formData.ingredients}
                      onChange={handleFormChange}
                      required
                      placeholder="List ingredients (one per line or comma-separated)"
                      rows="4"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="instructions">Instructions *</label>
                    <textarea
                      id="instructions"
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleFormChange}
                      required
                      placeholder="Enter step-by-step instructions"
                      rows="6"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="notes">Notes (Optional)</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      placeholder="Additional notes or tips"
                      rows="3"
                    />
                  </div>
                  <div className="form-group checkbox-group">
                    <label htmlFor="isPublic" className="checkbox-label">
                      <input
                        type="checkbox"
                        id="isPublic"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleFormChange}
                      />
                      <span>Make this recipe public</span>
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      {formData.isPublic ? "Publish Recipe" : "Save Recipe"}
                    </button>
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => {
                        setShowForm(false);
                        setFormData({
                          title: "",
                          ingredients: "",
                          instructions: "",
                          notes: "",
                          isPublic: false,
                        });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="input-section">
              <label htmlFor="recipe-input" className="input-label">
                <img src={halalInputIcon} alt="Recipe Input" className="section-icon" />
                <span>Recipe Input</span>
              </label>
              {error && (
                <div className="error-message" role="alert">
                  {error}
                  {isOffline && (
                    <button
                      className="retry-button"
                      onClick={() => handleConvert()}
                      aria-label="Retry conversion"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
              <textarea
                id="recipe-input"
                placeholder={t("pasteRecipe")}
                value={recipe || ""}
                onChange={(e) => {
                  const newValue = e.target?.value || "";
                  setRecipe(newValue);
                  if (error) {
                    setError("");
                  }
                }}
              />
              <div className="input-actions">
                <button
                  onClick={handleDemoRecipe}
                  className="demo-btn"
                  aria-label="Load demo recipe"
                >
                  <Play className="button-icon-inline" aria-hidden="true" />
                  <span>{t("demoRecipe")}</span>
                </button>
              </div>
            </div>

            <button onClick={() => handleConvert()} className="convert-btn" aria-label="Convert recipe">
              <RefreshCw className="button-icon-inline" aria-hidden="true" />
              <span>{t("convert")}</span>
            </button>

            {safeConverted && (
              <div className="results fade-in">
                <div className="recipe-card">
                  <h2>
                    <img src={halalOutputIcon} alt="Converted Recipe" className="section-icon" />
                    <span>Converted Recipe</span>
                  </h2>
                  <pre className="recipe-output">
                    {highlightHaram(safeConverted)}
                  </pre>
                  <div className="recipe-actions">
                    <button onClick={copyToClipboard} aria-label="Copy to clipboard">
                      <ClipboardCopy className="button-icon-inline" aria-hidden="true" />
                      <span>{t("copy")}</span>
                    </button>
                    <button onClick={downloadRecipe} aria-label="Download recipe">
                      <Download className="button-icon-inline" aria-hidden="true" />
                      <span>{t("download")}</span>
                    </button>
                    <button onClick={saveRecipe} className="gold-outline" aria-label="Save recipe privately">
                      <Bookmark className="button-icon-inline" aria-hidden="true" />
                      <span>Save Privately</span>
                    </button>
                    <button onClick={handleShareToCommunity} className="share-community-btn" aria-label="Share to community">
                      <Share2 className="button-icon-inline" aria-hidden="true" />
                      <span>Share to Feed</span>
                    </button>
                  </div>
                  <div className="feedback-section">
                    <p className="feedback-label">{t("feedback")}:</p>
                    <button
                      onClick={() => handleFeedback(true)}
                      className="feedback-btn positive"
                      aria-label="Positive feedback"
                    >
                      <ThumbsUp className="button-icon-inline" aria-hidden="true" />
                      <span>Helpful</span>
                    </button>
                    <button
                      onClick={() => handleFeedback(false)}
                      className="feedback-btn negative"
                      aria-label="Negative feedback"
                    >
                      <ThumbsDown className="button-icon-inline" aria-hidden="true" />
                      <span>Not helpful</span>
                    </button>
                  </div>
                </div>

                <div className="confidence-section">
                  <h3>{t("confidenceScore")}: {adjustConfidenceScore(safeConfidence)}%</h3>
                  <div className="confidence-progress">
                    <div 
                      className="confidence-bar" 
                      style={{ width: `${adjustConfidenceScore(safeConfidence)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="issues-section">
                  <div 
                    className="accordion-header" 
                    onClick={toggleAccordion}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleAccordion();
                      }
                    }}
                  >
                    <h2>{t("ingredientCategories")}</h2>
                    <span className="accordion-icon">
                      {isAccordionOpen ? "−" : "+"}
                    </span>
                  </div>
                  
                  {isAccordionOpen && (
                    <div className="simple-explanation-toggle-wrapper">
                      <SimpleExplanationToggle
                        onToggle={setSimpleExplanationEnabled}
                        defaultEnabled={simpleExplanationEnabled}
                      />
                    </div>
                  )}

                  {isAccordionOpen && (
                    <div className="accordion-content">
                      {safeIssues.length > 0 ? (
                        <div className="ingredient-cards">
                          {safeIssues.map((issue, idx) => {
                            const ingredientName = issue?.ingredient || `ingredient-${idx}`;
                            const isOpen = openIngredientCards.has(ingredientName);
                            
                            return (
                              <div key={idx} className="ingredient-card">
                                <div 
                                  className="ingredient-card-header"
                                  onClick={() => toggleIngredientCard(ingredientName)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleIngredientCard(ingredientName);
                                    }
                                  }}
                                >
                                  <div className="ingredient-card-title">
                                    <strong>{issue?.ingredient || "—"}</strong>
                                    <span className="ingredient-replacement-preview">
                                      → {issue?.replacement || "—"}
                                    </span>
                                  </div>
                                  <span className="ingredient-card-icon">
                                    {isOpen ? "−" : "+"}
                                  </span>
                                </div>
                                
                                {isOpen && (
                                  <div className="ingredient-card-content">
                                    <div className="ingredient-detail-row">
                                      <span className="detail-label">Original:</span>
                                      <span className="detail-value">{issue?.ingredient || "—"}</span>
                                    </div>
                                    <div className="ingredient-detail-row">
                                      <span className="detail-label">Halal Replacement:</span>
                                      <span className="detail-value">{issue?.replacement || "—"}</span>
                                    </div>
                                    {(issue?.quranReference || issue?.hadithReference) && (
                                      <div className="references-accordion">
                                        <div 
                                          className="references-accordion-header"
                                          onClick={() => toggleReferences(ingredientName)}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault();
                                              toggleReferences(ingredientName);
                                            }
                                          }}
                                        >
                                          <span className="references-accordion-title">Quranic & Hadith References</span>
                                          <span className="references-accordion-icon">
                                            {openReferences.has(ingredientName) ? "−" : "+"}
                                          </span>
                                        </div>
                                        {openReferences.has(ingredientName) && (
                                          <div className="references-accordion-content">
                                            {simpleExplanationEnabled ? (
                                              <div className="simple-explanation-text">
                                                {issue?.ingredient && (
                                                  <p>
                                                    In simple terms: {issue.ingredient.toLowerCase().includes("pork") || issue.ingredient.toLowerCase().includes("bacon")
                                                      ? "this is made from pork, which is prohibited in Islam."
                                                      : issue.ingredient.toLowerCase().includes("wine") || issue.ingredient.toLowerCase().includes("alcohol")
                                                      ? "this contains alcohol, which is prohibited in Islam."
                                                      : "this ingredient is not halal (permitted) according to Islamic dietary laws."}
                                                  </p>
                                                )}
                                              </div>
                                            ) : (
                                              <>
                                                {issue?.quranReference && (
                                                  <div className="reference-item">
                                                    <span className="reference-label">Qur'an Reference:</span>
                                                    <span className="reference-value quran-text">{issue.quranReference}</span>
                                                  </div>
                                                )}
                                                {issue?.hadithReference && (
                                                  <div className="reference-item">
                                                    <span className="reference-label">Hadith Reference:</span>
                                                    <span className="reference-value hadith-text">{issue.hadithReference}</span>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {issue?.flavor && (
                                      <div className="ingredient-detail-row">
                                        <span className="detail-label">Flavor Note:</span>
                                        <span className="detail-value">{issue.flavor || "—"}</span>
                                      </div>
                                    )}
                                    {issue?.notes && (
                                      <div className="ingredient-detail-row">
                                        <span className="detail-label">Additional Notes:</span>
                                        <span className="detail-value">{issue.notes || "—"}</span>
                                      </div>
                                    )}
                                    <CommunityTips
                                      ingredient={issue?.ingredient}
                                      replacement={issue?.replacement}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="no-issues-message">
                          No haram ingredients were detected in this recipe. All ingredients are halal-compliant!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {safePublicRecipes.length > 0 && (
              <div className="public-recipes-section">
                <h2>
                  <Star className="section-icon-inline" aria-hidden="true" />
                  <span>{t("publicRecipes")}</span>
                </h2>
                <div className="saved-recipes-list">
                  {safePublicRecipes.map((recipeItem) => renderRecipeCard(recipeItem, true))}
                </div>
              </div>
            )}

            {safeSavedRecipes.length > 0 && (
              <div className="saved-recipes-section">
                <h2>
                  <Star className="section-icon-inline" aria-hidden="true" />
                  <span>{t("savedRecipes")}</span>
                </h2>
                <div className="saved-recipes-list">
                  {safeSavedRecipes.map((recipeItem) => renderRecipeCard(recipeItem, false))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "feed" && <SocialFeed />}
        {activeTab === "profile" && <UserProfile />}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => {
          setShowCreatePostModal(false);
          if (activeTab === "create") {
            setActiveTab("convert");
          }
        }}
        onPost={handlePostCreated}
        originalRecipe={recipe}
        convertedRecipe={converted}
        confidenceScore={adjustConfidenceScore(safeConfidence)}
      />

      {/* Bottom Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <footer className="app-footer">
        <LanguageSwitcher />
        <p className="footer-text">© 2024 Halal Kitchen - Making recipes halal-compliant</p>
      </footer>
    </div>
  );
}

export default App;
