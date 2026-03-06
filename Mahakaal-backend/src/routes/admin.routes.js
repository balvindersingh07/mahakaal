// routes/admin.routes.js
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const adminAuth = require("../middleware/adminAuth");

// ---------- helpers ----------
async function findUserByIdOrPhone(userId, phone) {
  // 1) prefer _id (only if valid ObjectId)
  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
    const u = await User.findById(String(userId)).catch(() => null);
    if (u) return u;
  }

  // 2) fallback by phone
  if (phone) {
    const p = String(phone).replace(/\D/g, "").slice(-10); // supports +91, spaces
    const u = await User.findOne({ phone: p }).catch(() => null);
    if (u) return u;
  }

  return null;
}

function mustJWT(req, res) {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ success: false, message: "JWT_SECRET missing" });
    return false;
  }
  return true;
}

/**
 * Simple in-memory login throttle (no extra packages)
 * - resets on server restart (ok for now)
 */
const loginHits = new Map(); // key: ip, value: { c, t }
function tooMany(ip, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const prev = loginHits.get(ip);
  if (!prev) {
    loginHits.set(ip, { c: 1, t: now });
    return false;
  }
  if (now - prev.t > windowMs) {
    loginHits.set(ip, { c: 1, t: now });
    return false;
  }
  prev.c += 1;
  loginHits.set(ip, prev);
  return prev.c > max;
}

/**
 * ✅ Ensure there is a real admin user in DB (so adminAuth DB-verify passes)
 * IMPORTANT:
 * - ADMIN_PHONE is OPTIONAL.
 * - If no admin exists, we auto-create one with a generated UNIQUE 10-digit phone
 *   (only to satisfy User schema requirements).
 */
async function ensureAdminUser() {
  const username = String(process.env.ADMIN_USERNAME || "Admin").trim() || "Admin";

  // 1) If an admin already exists, use it
  const existingAdmin = await User.findOne({ role: "admin" }).catch(() => null);
  if (existingAdmin) {
    let changed = false;

    if (String(existingAdmin.status || "").toLowerCase() !== "active") {
      existingAdmin.status = "active";
      changed = true;
    }
    if (String(existingAdmin.role || "").toLowerCase() !== "admin") {
      existingAdmin.role = "admin";
      changed = true;
    }

    if (changed) await existingAdmin.save();
    return existingAdmin;
  }

  // 2) No admin in DB => create one

  const rawPass = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!rawPass) throw new Error("ADMIN_PASSWORD not set");

  // Prefer ADMIN_PHONE if present and valid, but ensure uniqueness
  const envPhone = String(process.env.ADMIN_PHONE || "").replace(/\D/g, "").slice(-10);
  const envPhoneOk = /^\d{10}$/.test(envPhone);

  async function pickUniquePhone() {
    // try env phone first if valid
    if (envPhoneOk) {
      const taken = await User.findOne({ phone: envPhone }).select("_id").lean();
      if (!taken) return envPhone;
    }

    // generate unique phone: 9xxxxxxxxx (10 digits)
    for (let i = 0; i < 20; i++) {
      const nineDigits = Math.floor(100000000 + Math.random() * 900000000); // 9 digits
      const p = "9" + String(nineDigits).slice(0, 9); // 10 digits total
      const exists = await User.findOne({ phone: p }).select("_id").lean();
      if (!exists) return p;
    }

    // last resort: time-based (still 10 digits)
    const fallback = "9" + String(Date.now()).slice(-9);
    return fallback;
  }

  const phone = await pickUniquePhone();
  const hash = await bcrypt.hash(rawPass, 10);

  // NOTE: we store password hash because schema requires password.
  // Login still checks ADMIN_PASSWORD env (password-only), not DB password.
  const adminUser = await User.create({
    username,
    phone, // internal only; UI use nahi hona zaroori
    password: hash,
    role: "admin",
    status: "active",
    wallet: 0,
  });

  return adminUser;
}

/**
 * ==========================
 * ADMIN LOGIN (password only)
 * POST /api/admin/login
 * body: { password }
 * ==========================
 */
router.post("/login", async (req, res) => {
  try {
    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    if (tooMany(ip)) {
      return res.status(429).json({ success: false, message: "Too many attempts, try later" });
    }

    const { password } = req.body || {};
    const pass = String(password || "").trim();

    if (!pass) {
      return res.status(400).json({ success: false, message: "Password required" });
    }

    const envPass = String(process.env.ADMIN_PASSWORD || "").trim();
    if (!envPass) {
      return res.status(500).json({ success: false, message: "ADMIN_PASSWORD not set" });
    }

    if (pass !== envPass) {
      return res.status(401).json({ success: false, message: "Invalid admin password" });
    }

    if (!mustJWT(req, res)) return;

    // ✅ Ensure real admin user exists (DB backed)
    const adminUser = await ensureAdminUser();

    // ✅ stable payload
    const payload = {
      id: adminUser._id.toString(),
      role: "admin",
      isAdmin: true,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      token,
      admin: {
        id: adminUser._id,
        username: adminUser.username,
        phone: adminUser.phone, // internal only
        role: "admin",
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

/**
 * ==========================
 * ADMIN USERS LIST
 * GET /api/admin/users?limit=200&page=1
 * return: users + rows + items (frontend-safe)
 * ==========================
 */
router.get("/users", adminAuth, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const pageRaw = Number(req.query.page);

    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const skip = (page - 1) * limit;

    const users = await User.find({}, { password: 0 })
      .populate("referredBy", "phone username referralCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      users,
      rows: users,
      items: users,
      page,
      limit,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

/**
 * ==========================
 * BLOCK / UNBLOCK USER
 * POST /api/admin/users/block
 * body: { id | userId, phone, block: true/false }
 * ==========================
 */
router.post("/users/block", adminAuth, async (req, res) => {
  try {
    const { id, userId, phone, block } = req.body || {};
    const makeBlocked = block === true || String(block).toLowerCase() === "true";

    const u = await findUserByIdOrPhone(userId || id, phone);
    if (!u) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ status enum matches your User schema (active/blocked)
    u.status = makeBlocked ? "blocked" : "active";

    // optional legacy compatibility (safe even if schema doesn't define it)
    u.isBlocked = makeBlocked;

    await u.save();

    return res.json({
      success: true,
      ok: true,
      status: u.status,
      isBlocked: !!u.isBlocked,
      user: { _id: u._id, phone: u.phone, status: u.status, isBlocked: !!u.isBlocked },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

/**
 * ==========================
 * DELETE USER
 * DELETE /api/admin/users/:id
 * + fallback: POST /api/admin/users/delete
 * ==========================
 */
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const u = await findUserByIdOrPhone(id, null);
    if (!u) return res.status(404).json({ success: false, message: "User not found" });

    await User.deleteOne({ _id: u._id });
    return res.json({ success: true, ok: true, message: "Deleted" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

router.post("/users/delete", adminAuth, async (req, res) => {
  try {
    const { id, userId, phone } = req.body || {};

    const u = await findUserByIdOrPhone(userId || id, phone || null);
    if (!u) return res.status(404).json({ success: false, message: "User not found" });

    await User.deleteOne({ _id: u._id });
    return res.json({ success: true, ok: true, message: "Deleted" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

/**
 * ==========================
 * RESET USER PASSWORD
 * POST /api/admin/users/password
 * body: { userId | phone, password }
 * ==========================
 */
router.post("/users/password", adminAuth, async (req, res) => {
  try {
    const { id, userId, phone, password } = req.body || {};

    const newPass = String(password || "").trim();
    if (!newPass || newPass.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }

    const u = await findUserByIdOrPhone(userId || id, phone || null);
    if (!u) return res.status(404).json({ success: false, message: "User not found" });

    u.password = await bcrypt.hash(newPass, 10);
    await u.save();

    return res.json({ success: true, ok: true, message: "Password updated" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

// alias: /api/admin/user/password (same handler)
router.post("/user/password", adminAuth, async (req, res) => {
  try {
    const { id, userId, phone, password } = req.body || {};
    const newPass = String(password || "").trim();
    if (!newPass || newPass.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }
    const u = await findUserByIdOrPhone(userId || id, phone || null);
    if (!u) return res.status(404).json({ success: false, message: "User not found" });
    u.password = await bcrypt.hash(newPass, 10);
    await u.save();
    return res.json({ success: true, ok: true, message: "Password updated" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
});

module.exports = router;
