import React, { useState, useEffect } from "react";
import { Settings, X } from "lucide-react";
import "./HalalStandardPanel.css";

function HalalStandardPanel({ onSettingsChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [strictnessLevel, setStrictnessLevel] = useState("standard");
  const [schoolOfThought, setSchoolOfThought] = useState("no-preference");

  useEffect(() => {
    // Load preferences from localStorage
    const savedStrictness = localStorage.getItem("halalStrictnessLevel");
    const savedSchool = localStorage.getItem("halalSchoolOfThought");
    
    if (savedStrictness) {
      setStrictnessLevel(savedStrictness);
    }
    if (savedSchool) {
      setSchoolOfThought(savedSchool);
    }
  }, []);

  const handleStrictnessChange = (level) => {
    setStrictnessLevel(level);
    localStorage.setItem("halalStrictnessLevel", level);
    if (onSettingsChange) {
      onSettingsChange({ strictnessLevel: level, schoolOfThought });
    }
  };

  const handleSchoolChange = (school) => {
    setSchoolOfThought(school);
    localStorage.setItem("halalSchoolOfThought", school);
    if (onSettingsChange) {
      onSettingsChange({ strictnessLevel, schoolOfThought: school });
    }
  };

  const getStrictnessDescription = (level) => {
    switch (level) {
      case "strict":
        return "Avoid all cross-contamination mentions and questionable items";
      case "standard":
        return "Follow mainstream halal guidelines";
      case "flexible":
        return "Allow debatable items like vanilla extract";
      default:
        return "";
    }
  };

  return (
    <>
      <button
        className="settings-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open halal standard settings"
      >
        <Settings className="settings-icon" />
        <span>My Halal Standard</span>
      </button>

      {isOpen && (
        <div className="settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>My Halal Standard</h2>
              <button
                className="settings-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close settings"
              >
                <X className="close-icon" />
              </button>
            </div>

            <div className="settings-content">
              <div className="settings-section">
                <h3>Strictness Level</h3>
                <p className="settings-description">
                  Choose how strictly you want to follow halal guidelines
                </p>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="strictness"
                      value="strict"
                      checked={strictnessLevel === "strict"}
                      onChange={(e) => handleStrictnessChange(e.target.value)}
                    />
                    <div className="radio-content">
                      <span className="radio-label">Strict</span>
                      <span className="radio-description">
                        Avoid all cross-contamination mentions
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="strictness"
                      value="standard"
                      checked={strictnessLevel === "standard"}
                      onChange={(e) => handleStrictnessChange(e.target.value)}
                    />
                    <div className="radio-content">
                      <span className="radio-label">Standard</span>
                      <span className="radio-description">
                        Follow mainstream halal guidelines
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="strictness"
                      value="flexible"
                      checked={strictnessLevel === "flexible"}
                      onChange={(e) => handleStrictnessChange(e.target.value)}
                    />
                    <div className="radio-content">
                      <span className="radio-label">Flexible</span>
                      <span className="radio-description">
                        Allow debatable items like vanilla extract
                      </span>
                    </div>
                  </label>
                </div>
                {strictnessLevel && (
                  <div className="current-selection">
                    <strong>Current:</strong> {getStrictnessDescription(strictnessLevel)}
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h3>School of Thought (Optional)</h3>
                <p className="settings-description">
                  Select your preferred Islamic school of thought
                </p>
                <select
                  className="school-select"
                  value={schoolOfThought}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                >
                  <option value="no-preference">No preference</option>
                  <option value="hanafi">Hanafi</option>
                  <option value="shafii">Shafi'i</option>
                  <option value="maliki">Maliki</option>
                  <option value="hanbali">Hanbali</option>
                </select>
                {schoolOfThought !== "no-preference" && (
                  <div className="current-selection">
                    <strong>Selected:</strong> {schoolOfThought.charAt(0).toUpperCase() + schoolOfThought.slice(1)}
                  </div>
                )}
              </div>

              <div className="settings-footer">
                <button
                  className="settings-save-btn"
                  onClick={() => setIsOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HalalStandardPanel;
