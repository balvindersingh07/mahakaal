// routes/deposit.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const Deposit = require("../models/Deposit");
const path = require("path");

const MIN_DEPOSIT_AMOUNT = Number(process.env.MIN_DEPOSIT_AMOUNT) || 50;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function validateScreenshotUrl(url) {
  if (!url || typeof url !== "string") return false;
  const s = url.trim().toLowerCase();
  return (
    s.startsWith("/uploads/") ||
    s.includes("/uploads/") ||
    s.startsWith("http") ||
    s.endsWith(".jpg") ||
    s.endsWith(".jpeg") ||
    s.endsWith(".png") ||
    s.endsWith(".webp")
  );
}

/**
 * POST /api/deposit/request
 * Body: { amount, screenshot, transactionNote? }
 * screenshot: base64 string or URL (from upload)
 */
router.post("/deposit/request", auth, async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { amount, screenshot, screenshotUrl, transactionNote } = req.body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < MIN_DEPOSIT_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Minimum deposit amount is ₹${MIN_DEPOSIT_AMOUNT}`,
      });
    }

    let finalUrl = screenshotUrl;
    if (screenshot && typeof screenshot === "string") {
      const m = screenshot.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!m) {
        return res.status(400).json({
          success: false,
          message: "Invalid screenshot format. Use JPEG, PNG or WebP.",
        });
      }
      const ext = m[1] === "jpeg" ? "jpg" : m[1];
      const fs = require("fs");
      const UPLOADS_DIR = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const filename = `deposit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, Buffer.from(m[2], "base64"));
      finalUrl = `/uploads/${filename}`;
    }

    if (!finalUrl || !validateScreenshotUrl(finalUrl)) {
      return res.status(400).json({
        success: false,
        message: "Screenshot (image) is required. Upload payment screenshot.",
      });
    }

    const deposit = await Deposit.create({
      user: userId,
      amount: amt,
      screenshotUrl: String(finalUrl).trim(),
      status: "pending",
      transactionNote: String(transactionNote || "").trim(),
    });

    const populated = await Deposit.findById(deposit._id)
      .populate("user", "username phone")
      .lean();

    const { sendToAdmin } = require("../services/adminPush.service");
    sendToAdmin("💳 New UPI Deposit", `User requested add money ₹${amt}`).catch(() => {});

    return res.json({ success: true, deposit: populated });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to submit deposit request",
    });
  }
});

/**
 * GET /api/deposit/my - user's own deposit requests
 */
router.get("/deposit/my", auth, async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const list = await Deposit.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, deposits: list });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to load deposits",
    });
  }
});

module.exports = router;
