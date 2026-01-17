import React, { useState, useEffect } from "react";
import { X, Image, Video, Hash, Send } from "lucide-react";
import MediaUploader from "./MediaUploader";
import { evaluateItem } from "../lib/halalEngine";
import { FEATURES } from "../lib/featureFlags";
import "./CreatePostModal.css";

function CreatePostModal({ isOpen, onClose, onPost, originalRecipe, convertedRecipe, confidenceScore, issues = [], halalSettings = {} }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [category, setCategory] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [displayName, setDisplayName] = useState("You");
  const [sharePublicly, setSharePublicly] = useState(false);

  useEffect(() => {
    // Load profile display name
    try {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.displayName) {
          setDisplayName(parsed.displayName);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert("Please enter a recipe title");
      return;
    }

    // Enhance issues with Halal Knowledge Model data
    let expandedIssues = [];
    if (FEATURES.HALAL_KNOWLEDGE_ENGINE && Array.isArray(issues) && issues.length > 0) {
      expandedIssues = issues.map((issue) => {
        if (issue?.ingredient) {
          const normalizedIngredient = issue.ingredient.toLowerCase().trim().replace(/\s+/g, "_");
          const engineResult = evaluateItem(normalizedIngredient, {
            madhab: halalSettings?.schoolOfThought || "no-preference",
            strictness: halalSettings?.strictnessLevel || "standard"
          });
          
          return {
            ...issue,
            // Add knowledge model fields
            inheritedFrom: engineResult.inheritedFrom || issue.inheritedFrom,
            alternatives: engineResult.alternatives || issue.alternatives,
            notes: engineResult.notes || issue.notes,
            eli5: engineResult.eli5 || issue.eli5,
            tags: engineResult.tags || issue.tags,
            trace: engineResult.trace || issue.trace || [],
            hkmResult: engineResult
          };
        }
        return issue;
      });
    } else {
      expandedIssues = issues;
    }

    const post = {
      id: Date.now().toString(),
      userId: "current_user",
      username: displayName || "You",
      title: title.trim(),
      description: description.trim(),
      originalRecipe: originalRecipe || "",
      convertedRecipe: convertedRecipe || "",
      confidenceScore: confidenceScore || 0,
      category: category || "Main Course",
      hashtags: hashtags
        .split(" ")
        .filter((tag) => tag.trim())
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
      mediaUrls: mediaFiles.map((file) => URL.createObjectURL(file)),
      mediaType: "image",
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isSaved: false,
      isPublic: sharePublicly,
      createdAt: new Date().toISOString(),
      // Include expanded ingredient data from knowledge model
      ingredients: expandedIssues
    };

    if (onPost) {
      onPost(post);
    }

    // Reset form
    setTitle("");
    setDescription("");
    setHashtags("");
    setCategory("");
    setMediaFiles([]);
    setSharePublicly(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share to Community</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X className="close-icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-group">
            <label htmlFor="post-title">Recipe Title *</label>
            <input
              type="text"
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Halal Chicken Biryani"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-description">Description</label>
            <textarea
              id="post-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell the community about your recipe conversion..."
              rows="4"
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-category">Category</label>
            <select
              id="post-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="">Select category</option>
              <option value="Main Course">Main Course</option>
              <option value="Dessert">Dessert</option>
              <option value="Appetizer">Appetizer</option>
              <option value="Breakfast">Breakfast</option>
              <option value="Snack">Snack</option>
              <option value="Beverage">Beverage</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="post-hashtags">
              <Hash className="label-icon" />
              Hashtags
            </label>
            <input
              type="text"
              id="post-hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#HalalCooking #NoAlcohol (space-separated)"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Media (Images/Videos)</label>
            <MediaUploader
              files={mediaFiles}
              onFilesChange={setMediaFiles}
              maxFiles={5}
            />
          </div>

          {(originalRecipe || convertedRecipe) && (
            <div className="recipe-preview">
              <h3>Recipe Preview</h3>
              {originalRecipe && (
                <div className="preview-section">
                  <strong>Original:</strong>
                  <pre>{originalRecipe}</pre>
                </div>
              )}
              {convertedRecipe && (
                <div className="preview-section">
                  <strong>Halal Converted:</strong>
                  <pre>{convertedRecipe}</pre>
                </div>
              )}
              {confidenceScore > 0 && (
                <div className="preview-section">
                  <strong>Halal Confidence:</strong> {confidenceScore}%
                </div>
              )}
            </div>
          )}

          <div className="form-group checkbox-group">
            <label htmlFor="share-publicly" className="checkbox-label">
              <input
                type="checkbox"
                id="share-publicly"
                checked={sharePublicly}
                onChange={(e) => setSharePublicly(e.target.checked)}
                className="checkbox-input"
              />
              <span>Share publicly to Feed</span>
            </label>
            <p className="checkbox-help-text">
              {sharePublicly 
                ? "This recipe will be visible to everyone in the community feed"
                : "This recipe will be saved privately to your profile"}
            </p>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              <Send className="submit-icon" />
              {sharePublicly ? "Post to Feed" : "Save Privately"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePostModal;
