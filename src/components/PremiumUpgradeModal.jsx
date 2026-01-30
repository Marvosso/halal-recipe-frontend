import React, { useState } from "react";
import { X, Check, Sparkles, Shield, Zap, FileText, Calendar } from "lucide-react";
import { isPremiumUser } from "../lib/subscription";
import "./PremiumUpgradeModal.css";

/**
 * Premium Upgrade Modal
 * Displays premium features and pricing
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.triggerFeature - Feature that triggered upgrade (optional)
 */
function PremiumUpgradeModal({ isOpen, onClose, triggerFeature = null }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  if (!isOpen) return null;

  // Don't show if already premium
  if (isPremiumUser()) {
    return null;
  }

  const monthlyPrice = 9.99;
  const annualPrice = 99;
  const annualMonthlyEquivalent = annualPrice / 12;

  const handleUpgrade = () => {
    // TODO: Integrate with payment processor (Stripe)
    console.log('Upgrade to Premium:', selectedPlan);
    // Redirect to payment page or open Stripe checkout
  };

  const handleStartTrial = () => {
    // TODO: Start free trial
    console.log('Start free trial');
    // Redirect to trial signup
  };

  const premiumFeatures = [
    {
      icon: <Shield size={20} />,
      title: "Brand-Level Halal Verification",
      description: "Check if specific brands are halal-certified"
    },
    {
      icon: <Zap size={20} />,
      title: "Advanced Substitution Logic",
      description: "See all alternatives with flavor/texture match scores"
    },
    {
      icon: <FileText size={20} />,
      title: "PDF & JSON Export",
      description: "Export recipes in multiple formats for meal planning"
    },
    {
      icon: <Calendar size={20} />,
      title: "Meal Planning Integration",
      description: "Export to meal planning apps and generate shopping lists"
    },
    {
      icon: <Sparkles size={20} />,
      title: "Unlimited Recipe Saves",
      description: "Save unlimited recipes with collections and search"
    }
  ];

  return (
    <div className="premium-upgrade-modal-overlay" onClick={onClose}>
      <div className="premium-upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="premium-upgrade-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <div className="premium-upgrade-modal-content">
          <div className="premium-upgrade-header">
            <h2 className="premium-upgrade-title">Unlock Premium Features</h2>
            <p className="premium-upgrade-subtitle">
              Get advanced halal verification, unlimited saves, and exclusive features
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="premium-upgrade-pricing-toggle">
            <button
              className={`pricing-toggle-option ${selectedPlan === 'monthly' ? 'active' : ''}`}
              onClick={() => setSelectedPlan('monthly')}
            >
              Monthly
            </button>
            <button
              className={`pricing-toggle-option ${selectedPlan === 'annual' ? 'active' : ''}`}
              onClick={() => setSelectedPlan('annual')}
            >
              Annual
              <span className="pricing-badge">Save $20</span>
            </button>
          </div>

          {/* Pricing Display */}
          <div className="premium-upgrade-pricing">
            {selectedPlan === 'monthly' ? (
              <div className="pricing-display">
                <span className="pricing-amount">${monthlyPrice}</span>
                <span className="pricing-period">/month</span>
              </div>
            ) : (
              <div className="pricing-display">
                <span className="pricing-amount">${annualPrice}</span>
                <span className="pricing-period">/year</span>
                <span className="pricing-equivalent">
                  ${annualMonthlyEquivalent.toFixed(2)}/month
                </span>
              </div>
            )}
          </div>

          {/* Features List */}
          <div className="premium-upgrade-features">
            {premiumFeatures.map((feature, idx) => (
              <div key={idx} className="premium-feature-item">
                <div className="premium-feature-icon">
                  {feature.icon}
                </div>
                <div className="premium-feature-content">
                  <h4 className="premium-feature-title">{feature.title}</h4>
                  <p className="premium-feature-description">{feature.description}</p>
                </div>
                <Check className="premium-feature-check" size={20} />
              </div>
            ))}
          </div>

          {/* Additional Benefits */}
          <div className="premium-upgrade-benefits">
            <div className="premium-benefit-item">
              <Check size={16} />
              <span>Unlimited recipe conversions</span>
            </div>
            <div className="premium-benefit-item">
              <Check size={16} />
              <span>Priority support (24-hour response)</span>
            </div>
            <div className="premium-benefit-item">
              <Check size={16} />
              <span>Early access to new features</span>
            </div>
            <div className="premium-benefit-item">
              <Check size={16} />
              <span>Cancel anytime</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="premium-upgrade-actions">
            <button
              className="premium-upgrade-cta primary"
              onClick={handleUpgrade}
            >
              {selectedPlan === 'monthly' 
                ? `Upgrade for $${monthlyPrice}/month`
                : `Upgrade for $${annualPrice}/year`
              }
            </button>
            <button
              className="premium-upgrade-cta secondary"
              onClick={handleStartTrial}
            >
              Start Free Trial
            </button>
          </div>

          {/* Trust Elements */}
          <div className="premium-upgrade-trust">
            <p className="trust-text">
              ✓ 30-day money-back guarantee
              <br />
              ✓ No credit card required for trial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PremiumUpgradeModal;
