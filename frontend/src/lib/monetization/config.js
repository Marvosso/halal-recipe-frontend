/**
 * Monetization feature flags — free product, ad-supported.
 * Affiliate substitute tips: off by default (needs traffic + program approval).
 * Display ads (AdSense): on by default when slot IDs are configured.
 */

function envFlag(name, defaultOn = false) {
  const v = typeof import.meta !== "undefined" ? import.meta.env?.[name] : undefined;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultOn;
}

/** Publisher ID from index.html — used when VITE_ADSENSE_CLIENT is unset. */
export const DEFAULT_ADSENSE_CLIENT = "ca-pub-7752228611815749";

/** Contextual halal substitute shop tips (non-blocking, lazy-loaded). */
export function isAffiliateRecommendationsEnabled() {
  return envFlag("VITE_ENABLE_AFFILIATE_RECOMMENDATIONS", false);
}

/** Third-party display ads (AdSense). Primary MVP monetization path. */
export function isContextualAdsEnabled() {
  return envFlag("VITE_ENABLE_CONTEXTUAL_ADS", true);
}

export function getAdSenseClient() {
  if (!isContextualAdsEnabled()) return "";
  return import.meta.env?.VITE_ADSENSE_CLIENT || DEFAULT_ADSENSE_CLIENT;
}
