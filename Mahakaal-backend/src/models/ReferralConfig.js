// models/ReferralConfig.js
const mongoose = require("mongoose");

/**
 * Global referral / commission configuration.
 *
 * We keep a single document in this collection and expose it to the
 * admin panel so the owner can tune:
 * - enabled: turn referral commission on/off
 * - ratePercent: commission percent on operator PROFIT (0–100)
 */
const referralConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },

    // Commission percent from operator profit (e.g. 2 → 2%)
    ratePercent: {
      type: Number,
      default: 2,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReferralConfig", referralConfigSchema);

