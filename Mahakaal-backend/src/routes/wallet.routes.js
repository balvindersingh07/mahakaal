// src/routes/wallet.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// GET /api/wallet
router.get("/wallet", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("wallet").lean();

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const w = Number(user.wallet || 0);

    return res.json({
      success: true,
      wallet: w,
      balance: w, // compatibility
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Wallet fetch failed" });
  }
});

module.exports = router;
