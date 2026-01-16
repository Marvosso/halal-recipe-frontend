import React, { useState, useEffect } from "react";
import { User, BookOpen, Heart, Users, Settings, Moon, Sun, Bell, Shield, HelpCircle, LogOut } from "lucide-react";
import RecipePost from "./RecipePost";
import { useTheme } from "../contexts/ThemeContext";
import HelpModal from "./HelpModal";
import PrivacyModal from "./PrivacyModal";
import NotificationsModal from "./NotificationsModal";
import AccountModal from "./AccountModal";
import EditProfileModal from "./EditProfileModal";
import HalalPreferencesModal from "./HalalPreferencesModal";
import "./UserProfile.css";

function UserProfile() {
  const { theme, toggleTheme } = useTheme();
  const [userStats, setUserStats] = useState({
    recipesConverted: 0,
    recipesShared: 0,
    likesReceived: 0,
    followers: 0,
    following: 0,
  });
  const [userPosts, setUserPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [profile, setProfile] = useState({
    displayName: "",
    bio: "",
    avatarColor: "#0A9D58",
  });
  
  // Modal states
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isHalalPreferencesModalOpen, setIsHalalPreferencesModalOpen] = useState(false);

  useEffect(() => {
    loadUserData();
    loadProfile();
    
    // Listen for profile updates
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setProfile(e.detail);
      }
      loadProfile();
    };
    
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  const loadUserData = () => {
    try {
      // Load user posts
      const posts = JSON.parse(localStorage.getItem("halalKitchenPosts") || "[]");
      const userPosts = posts.filter((p) => p.userId === "current_user");
      setUserPosts(userPosts);

      // Load saved posts
      const saved = JSON.parse(localStorage.getItem("halalKitchenSavedPosts") || "[]");
      setSavedPosts(saved);

      // Calculate stats
      const recipesConverted = parseInt(localStorage.getItem("userRecipesConverted") || "0");
      const likesReceived = userPosts.reduce((sum, post) => sum + (post.likes || 0), 0);

      setUserStats({
        recipesConverted,
        recipesShared: userPosts.length,
        likesReceived,
        followers: 0,
        following: 0,
      });
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadProfile = () => {
    try {
      const saved = localStorage.getItem("userProfile");
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfile({
          displayName: parsed.displayName || "",
          bio: parsed.bio || "",
          avatarColor: parsed.avatarColor || "#0A9D58",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleLogOut = () => {
    alert("Log out feature is coming soon! For now, all data is stored locally on your device.");
  };

  const handleLike = (postId) => {
    setUserPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const handleSave = (postId) => {
    // Toggle save
    const isSaved = savedPosts.some((p) => p.id === postId);
    if (isSaved) {
      setSavedPosts(savedPosts.filter((p) => p.id !== postId));
    } else {
      const post = userPosts.find((p) => p.id === postId);
      if (post) {
        setSavedPosts([...savedPosts, post]);
      }
    }
    localStorage.setItem("halalKitchenSavedPosts", JSON.stringify(savedPosts));
  };

  return (
    <div className="user-profile">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          <div 
            className="avatar-placeholder-large"
            style={{ background: `linear-gradient(135deg, ${profile.avatarColor} 0%, var(--accent-gold) 100%)` }}
          >
            <User className="avatar-icon" />
          </div>
        </div>
        <div className="profile-info">
          <h1 className="profile-username">
            {profile.displayName || "Your Profile"}
          </h1>
          {profile.bio && (
            <p className="profile-bio">{profile.bio}</p>
          )}
          <button 
            className="edit-profile-btn"
            onClick={() => setIsEditProfileModalOpen(true)}
            aria-label="Edit profile"
          >
            <Settings className="settings-icon" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <BookOpen className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">{userStats.recipesConverted}</div>
            <div className="stat-label">Recipes Converted</div>
          </div>
        </div>
        <div className="stat-card">
          <Heart className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">{userStats.recipesShared}</div>
            <div className="stat-label">Recipes Shared</div>
          </div>
        </div>
        <div className="stat-card">
          <Heart className="stat-icon liked" />
          <div className="stat-content">
            <div className="stat-value">{userStats.likesReceived}</div>
            <div className="stat-label">Likes Received</div>
          </div>
        </div>
        <div className="stat-card">
          <Users className="stat-icon" />
          <div className="stat-content">
            <div className="stat-value">{userStats.followers}</div>
            <div className="stat-label">Followers</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button className="profile-tab active">My Recipes</button>
        <button className="profile-tab">Saved</button>
      </div>

      {/* Settings Section */}
      <div className="profile-settings">
        <h3 className="settings-title">Settings</h3>
        <div className="settings-list">
          <button 
            className="settings-item"
            onClick={() => setIsAccountModalOpen(true)}
            aria-label="Open account information"
          >
            <User className="settings-icon" />
            <span>Account</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => setIsHalalPreferencesModalOpen(true)}
            aria-label="Open halal preferences"
          >
            <BookOpen className="settings-icon" />
            <span>Halal Preferences</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => setIsNotificationsModalOpen(true)}
            aria-label="Open notification settings"
          >
            <Bell className="settings-icon" />
            <span>Notifications</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => setIsPrivacyModalOpen(true)}
            aria-label="Open privacy information"
          >
            <Shield className="settings-icon" />
            <span>Privacy</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => setIsHelpModalOpen(true)}
            aria-label="Open help and support"
          >
            <HelpCircle className="settings-icon" />
            <span>Help</span>
          </button>
          <button 
            className="settings-item" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="settings-icon" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="settings-icon" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
          <button 
            className="settings-item logout"
            onClick={handleLogOut}
            aria-label="Log out (coming soon)"
          >
            <LogOut className="settings-icon" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Posts Section */}
      <div className="profile-posts">
        {userPosts.length === 0 ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h3>No recipes shared yet</h3>
            <p>Start converting and sharing recipes to build your profile!</p>
          </div>
        ) : (
          <div className="posts-list">
            {userPosts.map((post) => (
              <RecipePost
                key={post.id}
                post={post}
                onLike={handleLike}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />
      <PrivacyModal 
        isOpen={isPrivacyModalOpen} 
        onClose={() => setIsPrivacyModalOpen(false)} 
      />
      <NotificationsModal 
        isOpen={isNotificationsModalOpen} 
        onClose={() => setIsNotificationsModalOpen(false)} 
      />
      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />
      <EditProfileModal 
        isOpen={isEditProfileModalOpen} 
        onClose={() => setIsEditProfileModalOpen(false)} 
      />
      <HalalPreferencesModal 
        isOpen={isHalalPreferencesModalOpen} 
        onClose={() => setIsHalalPreferencesModalOpen(false)}
        onSettingsChange={(settings) => {
          // Settings are already saved in localStorage by the modal
          console.log("Halal preferences updated:", settings);
        }}
      />
    </div>
  );
}

export default UserProfile;
