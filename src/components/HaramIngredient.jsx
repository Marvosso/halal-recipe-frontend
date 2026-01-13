import React from "react";
import "./HaramIngredient.css";

function HaramIngredient({ name, quranRef, hadithRef }) {
  // Only show tooltip if at least one reference exists
  const hasReference = quranRef || hadithRef;

  return (
    <span className={`haram-ingredient ${hasReference ? "haram-ingredient-with-tooltip" : ""}`}>
      <strong>{name}</strong>
      {hasReference && (
        <span className="haram-tooltip-content">
          {quranRef && (
            <div className="tooltip-reference">
              <span className="tooltip-label">Quran reference:</span>
              <span className="tooltip-text">{quranRef}</span>
            </div>
          )}
          {hadithRef && (
            <div className="tooltip-reference">
              <span className="tooltip-label">Hadith reference:</span>
              <span className="tooltip-text">{hadithRef}</span>
            </div>
          )}
        </span>
      )}
    </span>
  );
}

export default HaramIngredient;
