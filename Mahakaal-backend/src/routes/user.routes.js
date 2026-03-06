const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// ✅ ALWAYS fetch fresh user from DB
router.get("/me", auth, async (req, res) => {
  try {
    // auth middleware should set req.user.id OR req.user._id
    const uid = req.user?.id || req.user?._id;

    const user = await User.findById(uid).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        wallet: Number(user.wallet || 0),
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Server error",
    });
  }
});

// ✅ SIMPLE WALLET ENDPOINT (to stop 404 in WalletScreen)
// GET /wallet  and /api/wallet
router.get("/wallet", auth, async (req, res) => {
  try {
    const uid = req.user?.id || req.user?._id;
    const user = await User.findById(uid).select("wallet");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ wallet: Number(user.wallet || 0) });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;
