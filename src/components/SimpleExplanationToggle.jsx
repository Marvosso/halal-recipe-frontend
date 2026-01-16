import React, { useState, useEffect } from "react";
import "./SimpleExplanationToggle.css";

function SimpleExplanationToggle({ onToggle, defaultEnabled = false }) {
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);

  useEffect(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem("simpleExplanationEnabled");
    if (saved !== null) {
      setIsEnabled(saved === "true");
    }
  }, []);

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
