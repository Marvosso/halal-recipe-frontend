import React, { useState, useEffect } from "react";
import "./SimpleExplanationToggle.css";

function SimpleExplanationToggle({ onToggle, defaultEnabled = false }) {
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);

  useEffect(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem("simpleExplanationEnabled");
    if (saved !== null) {
      const savedValue = saved === "true";
      setIsEnabled(savedValue);
      // Sync with parent if callback provided
      if (onToggle) {
        onToggle(savedValue);
      }
    } else if (defaultEnabled) {
      // If no saved value but defaultEnabled is true, use it
      setIsEnabled(true);
      localStorage.setItem("simpleExplanationEnabled", "true");
      if (onToggle) {
        onToggle(true);
      }
    }
  }, []);

  // Sync with parent when defaultEnabled changes externally
  useEffect(() => {
    if (defaultEnabled !== isEnabled) {
      setIsEnabled(defaultEnabled);
    }
  }, [defaultEnabled, isEnabled]);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem("simpleExplanationEnabled", newValue.toString());
    if (onToggle) {
      onToggle(newValue);
    }
  };

  return (
    <div className="simple-explanation-toggle">
      <label className="toggle-label">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          className="toggle-checkbox"
          aria-label="Toggle simple explanation mode"
        />
        <span className="toggle-slider"></span>
        <span className="toggle-text">Explain Like I'm 5</span>
      </label>
    </div>
  );
}

export default SimpleExplanationToggle;
