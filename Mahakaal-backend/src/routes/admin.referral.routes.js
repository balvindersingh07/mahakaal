const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");

const {
  getReferralConfig,
  updateReferralConfig,
} = require("../controllers/referralConfig.controller");

// GET current referral / commission configuration
router.get("/referral-config", adminAuth, getReferralConfig);

// Update referral / commission configuration
router.post("/referral-config", adminAuth, updateReferralConfig);

module.exports = router;

