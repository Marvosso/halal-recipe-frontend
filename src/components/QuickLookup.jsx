import React, { useState } from "react";
import { Search, X, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import "./QuickLookup.css";

function QuickLookup({ onConvertClick }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hardcoded lookup data for common ingredients
  // In production, this would come from the backend
  const ingredientDatabase = {
    bacon: {
      status: "haram",
      explanation: "Bacon is made from pork, which is prohibited in Islam.",
      alternatives: ["Turkey bacon", "Beef bacon", "Halal chicken bacon"],
      quranRef: "Qur'an 2:173",
      hadithRef: "Sahih Muslim 1934"
    },
    pork: {
      status: "haram",
      explanation: "Pork is explicitly prohibited in the Qur'an.",
      alternatives: ["Beef", "Lamb", "Chicken", "Turkey"],
      quranRef: "Qur'an 2:173",
      hadithRef: "Sahih Bukhari 5496"
    },
    wine: {
      status: "haram",
      explanation: "Alcoholic beverages are prohibited in Islam.",
      alternatives: ["Grape juice", "Non-alcoholic wine", "Chicken/vegetable stock"],
      quranRef: "Qur'an 5:90",
      hadithRef: "Sahih Bukhari 5580"
    },
    "white wine": {
      status: "haram",
      explanation: "Alcoholic beverages are prohibited in Islam.",
      alternatives: ["Chicken stock", "Vegetable stock", "Non-alcoholic white wine"],
      quranRef: "Qur'an 5:90"
    },
    gelatin: {
      status: "questionable",
      explanation: "Gelatin may be derived from pork or non-halal sources. Check the source.",
      alternatives: ["Halal gelatin", "Agar-agar", "Pectin"],
      quranRef: "Qur'an 2:173"
    },
    "vanilla extract": {
      status: "questionable",
      explanation: "Some vanilla extracts contain alcohol. Look for alcohol-free versions.",
      alternatives: ["Vanilla powder", "Vanilla bean paste", "Alcohol-free vanilla extract"]
    },
    "beef": {
      status: "halal",
      explanation: "Beef is halal when slaughtered according to Islamic guidelines.",
      alternatives: []
    },
    "chicken": {
      status: "halal",
      explanation: "Chicken is halal when slaughtered according to Islamic guidelines.",
      alternatives: []
    },
    "lamb": {
      status: "halal",
      explanation: "Lamb is halal when slaughtered according to Islamic guidelines.",
      alternatives: []
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const normalizedTerm = searchTerm.toLowerCase().trim();
      const found = ingredientDatabase[normalizedTerm];
      
      if (found) {
        setResult(found);
      } else {
        // Try to find partial matches
        const partialMatch = Object.keys(ingredientDatabase).find(key => 
          normalizedTerm.includes(key) || key.includes(normalizedTerm)
        );
        
        if (partialMatch) {
          setResult(ingredientDatabase[partialMatch]);
        } else {
          setResult({
            status: "unknown",
            explanation: "We couldn't find information about this ingredient. Please check with a qualified Islamic scholar or use our full recipe converter.",
            alternatives: []
          });
        }
      }
      
      setIsLoading(false);
    }, 300);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setResult(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "halal":
        return <CheckCircle className="status-icon halal-icon" />;
      case "haram":
        return <XCircle className="status-icon haram-icon" />;
      case "questionable":
        return <AlertCircle className="status-icon questionable-icon" />;
      default:
        return <AlertCircle className="status-icon unknown-icon" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "halal":
        return "Halal";
      case "haram":
        return "Haram";
      case "questionable":
        return "Questionable";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="quick-lookup">
      <div className="quick-lookup-header">
        <h3>Is It Halal?</h3>
        <p className="quick-lookup-subtitle">Quick ingredient lookup</p>
      </div>
      
      <div className="quick-lookup-search">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Type an ingredient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
            aria-label="Search ingredient"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="clear-button"
              aria-label="Clear search"
            >
              <X className="clear-icon" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="search-button"
          disabled={isLoading || !searchTerm.trim()}
          aria-label="Search"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {result && (
        <div className="quick-lookup-result fade-in">
          <div className={`result-header ${result.status}`}>
            {getStatusIcon(result.status)}
            <div className="result-status">
              <span className="status-label">{getStatusText(result.status)}</span>
              {result.quranRef && (
                <span className="result-reference">{result.quranRef}</span>
              )}
            </div>
          </div>
          
          <div className="result-content">
            <p className="result-explanation">{result.explanation}</p>
            
            {result.alternatives && result.alternatives.length > 0 && (
              <div className="result-alternatives">
                <strong>Common alternatives:</strong>
                <ul>
                  {result.alternatives.map((alt, idx) => (
                    <li key={idx}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.hadithRef && (
              <div className="result-hadith">
                <strong>Hadith Reference:</strong> {result.hadithRef}
              </div>
            )}
            
            {onConvertClick && (
              <button
                onClick={() => {
                  if (onConvertClick) {
                    onConvertClick(searchTerm);
                  }
                }}
                className="convert-full-recipe-btn"
              >
                Convert Full Recipe
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickLookup;
