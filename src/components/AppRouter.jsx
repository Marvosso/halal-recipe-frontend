import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import HomePage from "../pages/HomePage";
import IsItHalalPage from "../pages/IsItHalalPage";
import HalalSubstitutesPage from "../pages/HalalSubstitutesPage";
import HowItWorksPage from "../pages/HowItWorksPage";
import AboutPage from "../pages/AboutPage";
import AppWrapper from "./AppWrapper";
import SEOFooter from "./SEOFooter";

function AppRouter() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          {/* SEO Landing Pages */}
          <Route path="/" element={<><HomePage /><SEOFooter /></>} />
          <Route path="/is-it-halal" element={<><IsItHalalPage /><SEOFooter /></>} />
          <Route path="/halal-substitutes" element={<><HalalSubstitutesPage /><SEOFooter /></>} />
          <Route path="/how-it-works" element={<><HowItWorksPage /><SEOFooter /></>} />
          <Route path="/about" element={<><AboutPage /><SEOFooter /></>} />
          
          {/* App Routes - Preserve existing behavior */}
          <Route path="/app" element={<AppWrapper />} />
          <Route path="/convert" element={<AppWrapper />} />
          
          {/* Redirect old routes to app */}
          <Route path="/feed" element={<Navigate to="/app" replace />} />
          <Route path="/profile" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default AppRouter;
