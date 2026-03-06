// src/routes/auth.routes.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ---------------- utils ----------------
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
const normalizePhone = (v) => onlyDigits(v).slice(-10); // keep last 10 digits
const isPhone10 = (v) => /^\d{10}$/.test(normalizePhone(v));

function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  return jwt.sign(
    { id: user._id.toString(), role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// ✅ Inline auth: attaches decoded {id, role}
function auth(req, res, next) {
  try {
    const h = String(req.headers.authorization || "").trim();
    const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";

    if (!token) return res.status(401).json({ success: false, message: "No token" });
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT_SECRET missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return res.status(401).json({ success: false, message: "Invalid token" });

    req.user = decoded; // {id, role}
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// -------------------------------
// POST /auth/register   (also mounted at /api/auth/register)
// Body: { username, phone, password, referralCode? }
// -------------------------------
router.post("/register", async (req, res) => {
  try {
    const { username, phone, password, referralCode } = req.body || {};

    const uname = String(username || "").trim();
    const ph = normalizePhone(phone);
    const pass = String(password || "").trim();

    if (!uname || !ph || !pass) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!isPhone10(ph)) {
      return res.status(400).json({ success: false, message: "Enter valid 10-digit phone" });
    }
    if (pass.length < 4) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 4 characters" });
    }

    const exists = await User.findOne({ phone: ph }).select("_id").lean();
    if (exists) {
      return res.status(409).json({ success: false, message: "Phone already registered" });
    }

    // ✅ Optional referral code
    let referredBy = null;
    const code = String(referralCode || "").trim().toUpperCase();
    if (code) {
      const refUser = await User.findOne({ referralCode: code }).select("_id").lean();
      if (refUser?._id) referredBy = refUser._id;
    }

    const hash = await bcrypt.hash(pass, 10);

    const user = await User.create({
      username: uname,
      phone: ph,
      password: hash,
      wallet: 0,
      role: "user",
      status: "active",
      referredBy,
    });

    const token = signToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        wallet: Number(user.wallet || 0),
        role: user.role,
        status: user.status,
        referralCode: user.referralCode || "",
        referredBy: user.referredBy || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
});

// -------------------------------
// POST /auth/login   (also mounted at /api/auth/login)
// Body: { phone, password }
// -------------------------------
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body || {};

    const ph = normalizePhone(phone);
    const pass = String(password || "");

    if (!ph || !pass) {
      return res.status(400).json({ success: false, message: "Phone and password required" });
    }
    if (!isPhone10(ph)) {
      return res.status(400).json({ success: false, message: "Enter valid 10-digit phone" });
    }

    // ✅ If schema has password select:false, this ensures we still get it
    const user = await User.findOne({ phone: ph }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (String(user.status || "").toLowerCase() === "blocked") {
      return res.status(403).json({ success: false, message: "User blocked" });
    }

    if (!user.password) {
      return res.status(500).json({ success: false, message: "Password not set for this user" });
    }

    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        wallet: Number(user.wallet || 0),
        role: user.role,
        status: user.status,
        referralCode: user.referralCode || "",
        referredBy: user.referredBy || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
});

// -------------------------------
// GET /auth/me   (also mounted at /api/auth/me)
// -------------------------------
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        wallet: Number(user.wallet || 0),
        role: user.role,
        status: user.status,
        referralCode: user.referralCode || "",
        referredBy: user.referredBy || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
});

// -------------------------------
// POST /auth/change-password (also mounted at /api/auth/change-password)
// Body: { oldPassword, newPassword, confirmPassword }
// -------------------------------
router.post("/change-password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body || {};

    const oldP = String(oldPassword || "").trim();
    const newP = String(newPassword || "").trim();
    const confP = String(confirmPassword || "").trim();

    if (!oldP || !newP || !confP) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (newP.length < 4) {
      return res
        .status(400)
        .json({ success: false, message: "New password must be at least 4 characters" });
    }
    if (newP !== confP) {
      return res
        .status(400)
        .json({ success: false, message: "New password and confirm password do not match" });
    }
    if (oldP === newP) {
      return res
        .status(400)
        .json({ success: false, message: "New password must be different from old password" });
    }

    // ✅ must load password explicitly
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (String(user.status || "").toLowerCase() === "blocked") {
      return res.status(403).json({ success: false, message: "User blocked" });
    }

    const ok = await bcrypt.compare(oldP, user.password || "");
    if (!ok) {
      return res.status(401).json({ success: false, message: "Old password is incorrect" });
    }

    user.password = await bcrypt.hash(newP, 10);
    await user.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
});

module.exports = router;
