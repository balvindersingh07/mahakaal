const router = require("express").Router();
const auth = require("../middleware/auth");
const Scanner = require("../models/Scanner");

/**
 * GET /api/scanner
 * Returns the active scanner for the current user (if any) or a global scanner (user=null).
 */
router.get("/scanner", auth, async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || req.id;

    let scanner = null;

    if (userId) {
      scanner = await Scanner.findOne({ user: userId, active: true })
        .sort({ updatedAt: -1 })
        .lean()
        .catch(() => null);
    }

    if (!scanner) {
      scanner = await Scanner.findOne({ user: null, active: true })
        .sort({ updatedAt: -1 })
        .lean()
        .catch(() => null);
    }

    return res.json({
      success: true,
      scanner,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to load scanner",
    });
  }
});

/**
 * POST /api/scanner
 * Body: { imageUrl } - save/update scanner for current user
 */
router.post("/scanner", auth, async (req, res) => {
  try {
    const userId = req.user?._id || req.userId || req.id;
    const { imageUrl } = req.body || {};
    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ success: false, message: "imageUrl required" });
    }
    const payload = { imageUrl: String(imageUrl).trim(), user: userId, active: true };
    const scanner = await Scanner.findOneAndUpdate(
      { user: userId },
      { $set: payload },
      { upsert: true, new: true }
    ).lean();
    return res.json({ success: true, scanner });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to save scanner",
    });
  }
});

module.exports = router;

