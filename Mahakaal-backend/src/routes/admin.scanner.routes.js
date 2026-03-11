const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const Scanner = require("../models/Scanner");
const User = require("../models/User");

async function resolveUserByPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "").slice(-10);
  if (!digits) return null;
  const user = await User.findOne({ phone: digits }).select("_id phone username").lean().catch(() => null);
  return user || null;
}

// GET /api/admin/scanners?phone=&active=
router.get("/scanners", adminAuth, async (req, res) => {
  try {
    const { phone, active } = req.query || {};
    const q = {};

    if (typeof active !== "undefined") {
      q.active = String(active).toLowerCase() !== "false";
    }

    if (phone) {
      const u = await resolveUserByPhone(phone);
      if (!u) {
        return res.json({ success: true, items: [], rows: [], scanners: [] });
      }
      q.user = u._id;
    }

    const list = await Scanner.find(q)
      .sort({ updatedAt: -1 })
      .populate("user", "username phone")
      .lean();

    return res.json({
      success: true,
      items: list,
      rows: list,
      scanners: list,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to load scanners",
    });
  }
});

// POST /api/admin/scanners
// body: { phone?, userId?, imageUrl, upiId?, note?, active? }
router.post("/scanners", adminAuth, async (req, res) => {
  try {
    const { phone, userId, imageUrl, upiId, note, active } = req.body || {};

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ success: false, message: "imageUrl required" });
    }

    let uid = userId || null;
    if (!uid && phone) {
      const u = await resolveUserByPhone(phone);
      uid = u?._id || null;
    }

    const payload = {
      imageUrl: String(imageUrl).trim(),
      upiId: upiId ? String(upiId).trim() : undefined,
      note: note ? String(note).trim() : undefined,
    };

    if (typeof active !== "undefined") {
      payload.active = !!active;
    }

    if (uid) {
      payload.user = uid;
    }

    // Global (user=null) or user-specific: upsert
    let scanner = null;
    const filter = uid ? { user: uid } : { user: null };
    payload.user = uid;
    scanner = await Scanner.findOneAndUpdate(
      filter,
      { $set: payload },
      { upsert: true, new: true }
    );

    const populated = await Scanner.findById(scanner._id)
      .populate("user", "username phone")
      .lean();

    return res.json({
      success: true,
      scanner: populated,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to save scanner",
    });
  }
});

// DELETE /api/admin/scanners/:id
router.delete("/scanners/:id", adminAuth, async (req, res) => {
  try {
    await Scanner.findByIdAndDelete(req.params.id).catch(() => null);
    return res.json({ success: true, ok: true });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to delete scanner",
    });
  }
});

module.exports = router;

