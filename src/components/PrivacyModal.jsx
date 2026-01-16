import React from "react";
import { Shield, Lock, Eye, Database } from "lucide-react";
import ProfileModal from "./ProfileModal";
import "./PrivacyModal.css";

function PrivacyModal({ isOpen, onClose }) {
  return (
    <ProfileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy & Data"
      ariaLabel="Privacy and data information"
    >
      <div className="privacy-modal-content">
        <div className="privacy-badge">
          <Shield className="privacy-icon" />
          <h3 className="privacy-badge-title">Your Privacy Matters</h3>
        </div>

        <section className="privacy-section">
          <div className="privacy-item">
            <Lock className="privacy-item-icon" />
            <div className="privacy-item-content">
              <h4 className="privacy-item-title">No Account Required</h4>
              <p className="privacy-item-text">
                Halal Kitchen works completely offline. You don't need to create an account 
                or provide any personal information to use the converter.
              </p>
            </div>
          </div>

          <div className="privacy-item">
            <Database className="privacy-item-icon" />
            <div className="privacy-item-content">
              <h4 className="privacy-item-title">Local Storage Only</h4>
              <p className="privacy-item-text">
                All your data is stored locally in your browser. Nothing is sent to our servers 
                or shared with third parties. Your recipes, preferences, and settings stay on your device.
              </p>
            </div>
          </div>

          <div className="privacy-item">
            <Eye className="privacy-item-icon" />
            <div className="privacy-item-content">
              <h4 className="privacy-item-title">No Tracking</h4>
              <p className="privacy-item-text">
                We don't track you across websites. No cookies, no analytics, no data collection. 
                Your browsing remains private.
              </p>
            </div>
          </div>
        </section>

        <section className="privacy-section">
          <h3 className="privacy-section-title">What's Stored Locally?</h3>
          <ul className="privacy-list">
            <li>Your converted recipes</li>
            <li>Halal preferences (strictness level, school of thought)</li>
            <li>Language preference</li>
            <li>Theme preference (light/dark mode)</li>
            <li>Notification settings</li>
            <li>Profile information (display name, bio, avatar color)</li>
          </ul>
          <p className="privacy-note">
            You can clear all this data anytime by clearing your browser's local storage.
          </p>
        </section>

        <section className="privacy-section">
          <div className="privacy-future">
            <h3 className="privacy-section-title">Future: Account System</h3>
            <p className="privacy-future-text">
              When accounts are introduced, you will have full control over your data. 
              You'll be able to:
            </p>
            <ul className="privacy-list">
              <li>Export your data anytime</li>
              <li>Delete your account and all associated data</li>
              <li>Choose what information to sync</li>
              <li>Opt out of any data collection</li>
            </ul>
            <p className="privacy-future-note">
              Your privacy will always be our priority.
            </p>
          </div>
        </section>
      </div>
    </ProfileModal>
  );
}

export default PrivacyModal;
