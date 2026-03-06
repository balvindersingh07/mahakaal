// src/routes/upload.routes.js
const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/auth");

// Uploads directory (create if missing)
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * POST /api/admin/upload-image
 * Body: { image: "data:image/png;base64,..." }
 * Returns: { url: "/uploads/scanner-xxx.png" }
 */
router.post("/admin/upload-image", adminAuth, (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ success: false, message: "image (base64) required" });
    }

    const m = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) {
      return res.status(400).json({ success: false, message: "Invalid base64 image" });
    }

    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const buf = Buffer.from(m[2], "base64");
    const filename = `scanner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buf);

    const url = `/uploads/${filename}`;
    return res.json({ success: true, url });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Upload failed" });
  }
});

/**
 * POST /api/upload-image (user auth)
 * Same as admin - for user Add Scanner
 */
router.post("/upload-image", auth, (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ success: false, message: "image (base64) required" });
    }

    const m = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) {
      return res.status(400).json({ success: false, message: "Invalid base64 image" });
    }

    const ext = m[1] === "jpeg" ? "jpg" : m[1];
    const buf = Buffer.from(m[2], "base64");
    const filename = `scanner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buf);

    const url = `/uploads/${filename}`;
    return res.json({ success: true, url });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Upload failed" });
  }
});

module.exports = router;
