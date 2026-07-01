import { describe, it } from "node:test";
import assert from "node:assert";
import {
  DEFAULT_ADSENSE_CLIENT,
  getAdSenseClient,
  isAffiliateRecommendationsEnabled,
  isContextualAdsEnabled,
} from "../config.js";

describe("monetization config defaults", () => {
  it("affiliate recommendations are off by default", () => {
    assert.strictEqual(isAffiliateRecommendationsEnabled(), false);
  });

  it("contextual ads are on by default", () => {
    assert.strictEqual(isContextualAdsEnabled(), true);
  });

  it("getAdSenseClient returns publisher id when ads enabled", () => {
    assert.strictEqual(getAdSenseClient(), DEFAULT_ADSENSE_CLIENT);
    assert.ok(getAdSenseClient().startsWith("ca-pub-"));
  });
});
