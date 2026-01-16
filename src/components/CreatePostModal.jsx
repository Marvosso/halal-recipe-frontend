import React, { useState, useEffect } from "react";
import { X, Image, Video, Hash, Send } from "lucide-react";
import MediaUploader from "./MediaUploader";
import "./CreatePostModal.css";

function CreatePostModal({ isOpen, onClose, onPost, originalRecipe, convertedRecipe, confidenceScore }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [category, setCategory] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [displayName, setDisplayName] = useState("You");

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
      createdAt: new Date().toISOString(),
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

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              <Send className="submit-icon" />
              Post to Feed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreatePostModal;
