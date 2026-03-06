// src/controllers/referralConfig.controller.js
const ReferralConfig = require("../models/ReferralConfig");

function toBool(v) {
  if (v === true || v === false) return v;
  const s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return null;
}

async function ensureConfig() {
  let cfg = await ReferralConfig.findOne();
  if (!cfg) {
    cfg = await ReferralConfig.create({});
  }
  return cfg;
}

/**
 * GET /api/admin/referral-config
 *
 * Returns:
 * {
 *   success: true,
 *   config: {
 *     enabled: boolean,
 *     ratePercent: number, // 0–100
 *     rateDecimal: number  // 0–1 (derived)
 *   }
 * }
 */
exports.getReferralConfig = async (req, res) => {
  try {
    const cfg = await ensureConfig();

    const ratePercent = Number.isFinite(Number(cfg.ratePercent))
      ? Number(cfg.ratePercent)
      : 2;

    const enabled = cfg.enabled !== false;

    return res.json({
      success: true,
      config: {
        enabled,
        ratePercent,
        rateDecimal: ratePercent / 100,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to load referral config",
    });
  }
};

/**
 * POST /api/admin/referral-config
 * Body: { enabled?: boolean, ratePercent?: number }
 */
exports.updateReferralConfig = async (req, res) => {
  try {
    const body = req.body || {};
    const cfg = await ensureConfig();

    if (body.enabled !== undefined) {
      const b = toBool(body.enabled);
      if (b !== null) {
        cfg.enabled = b;
      }
    }

    if (
      body.ratePercent !== undefined ||
      body.rate !== undefined ||
      body.commissionRate !== undefined
    ) {
      const raw =
        body.ratePercent !== undefined
          ? body.ratePercent
          : body.rate !== undefined
          ? body.rate
          : body.commissionRate;

      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        return res.status(400).json({
          success: false,
          message: "ratePercent must be between 0 and 100",
        });
      }
      cfg.ratePercent = num;
    }

    await cfg.save();

    const ratePercent = Number(cfg.ratePercent || 0);

    return res.json({
      success: true,
      config: {
        enabled: cfg.enabled !== false,
        ratePercent,
        rateDecimal: ratePercent / 100,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to update referral config",
    });
  }
};

