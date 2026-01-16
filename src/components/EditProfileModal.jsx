import React, { useState, useEffect } from "react";
import { User, Palette, FileText, Save } from "lucide-react";
import ProfileModal from "./ProfileModal";
import "./EditProfileModal.css";

function EditProfileModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState({
    displayName: "",
    bio: "",
    avatarColor: "#0A9D58", // Default green
  });

  useEffect(() => {
    // Load saved profile
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile({
          displayName: parsed.displayName || "",
          bio: parsed.bio || "",
          avatarColor: parsed.avatarColor || "#0A9D58",
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    }
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem("userProfile", JSON.stringify(profile));
    
    // Trigger a custom event to update profile display
    window.dispatchEvent(new CustomEvent("profileUpdated", { detail: profile }));
    
    onClose();
  };

  const avatarColors = [
    { name: "Green", value: "#0A9D58" },
    { name: "Gold", value: "#D4AF37" },
    { name: "Blue", value: "#3B82F6" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Red", value: "#EF4444" },
    { name: "Teal", value: "#14B8A6" },
  ];

  return (
    <ProfileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      ariaLabel="Edit your profile information"
    >
      <div className="edit-profile-modal-content">
        <div className="edit-profile-intro">
          <User className="edit-profile-intro-icon" />
          <p className="edit-profile-intro-text">
            Customize your profile. This information is stored locally and used 
            in your posts and profile display.
          </p>
        </div>

        <div className="edit-profile-form">
          <div className="edit-profile-field">
            <label htmlFor="displayName" className="edit-profile-label">
              <User className="edit-profile-label-icon" />
              <span>Display Name</span>
            </label>
            <input
              id="displayName"
              type="text"
              className="edit-profile-input"
              placeholder="Enter your display name"
              value={profile.displayName}
              onChange={(e) => handleChange("displayName", e.target.value)}
              maxLength={30}
            />
            <p className="edit-profile-hint">
              This name appears on your posts and profile (max 30 characters)
            </p>
          </div>

          <div className="edit-profile-field">
            <label htmlFor="bio" className="edit-profile-label">
              <FileText className="edit-profile-label-icon" />
              <span>Bio</span>
              <span className="edit-profile-optional">(Optional)</span>
            </label>
            <textarea
              id="bio"
              className="edit-profile-textarea"
              placeholder="Tell us about yourself..."
              value={profile.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              maxLength={120}
              rows={4}
            />
            <div className="edit-profile-char-count">
              {profile.bio.length}/120 characters
            </div>
          </div>

          <div className="edit-profile-field">
            <label className="edit-profile-label">
              <Palette className="edit-profile-label-icon" />
              <span>Avatar Color</span>
            </label>
            <div className="edit-profile-colors">
              {avatarColors.map((color) => (
                <button
                  key={color.value}
                  className={`edit-profile-color-btn ${
                    profile.avatarColor === color.value ? "active" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleChange("avatarColor", color.value)}
                  aria-label={`Select ${color.name} avatar color`}
                  title={color.name}
                >
                  {profile.avatarColor === color.value && (
                    <div className="color-check">✓</div>
                  )}
                </button>
              ))}
            </div>
            <p className="edit-profile-hint">
              Choose a color for your avatar background
            </p>
          </div>
        </div>

        <div className="edit-profile-actions">
          <button
            className="edit-profile-save-btn"
            onClick={handleSave}
            aria-label="Save profile changes"
          >
            <Save className="save-icon" />
            <span>Save Changes</span>
          </button>
          <button
            className="edit-profile-cancel-btn"
            onClick={onClose}
            aria-label="Cancel editing"
          >
            Cancel
          </button>
        </div>

        <div className="edit-profile-note">
          <p className="edit-profile-note-text">
            <strong>Note:</strong> Profile changes are saved locally. When accounts 
            are introduced, you'll be able to sync this information across devices.
          </p>
        </div>
      </div>
    </ProfileModal>
  );
}

export default EditProfileModal;
