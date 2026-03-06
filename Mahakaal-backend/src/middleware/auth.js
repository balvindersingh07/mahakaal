// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function auth(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT_SECRET missing" });
    }

    const header = String(req.headers.authorization || "").trim();
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      const msg = e?.name === "TokenExpiredError" ? "Token expired" : "Unauthorized";
      return res.status(401).json({ success: false, message: msg });
    }

    // ✅ User routes must NOT accept admin token
    const isAdminToken =
      decoded?.role === "admin" || decoded?.isAdmin === true || decoded?.admin === true;

    if (isAdminToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Accept common keys
    const uid =
      decoded?.id ||
      decoded?._id ||
      decoded?.userId ||
      decoded?.uid ||
      decoded?.sub ||
      decoded?.user?._id ||
      decoded?.user?.id ||
      null;

    if (!uid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(uid).select("-password").lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ blocked check
    const status = String(user.status || "").toLowerCase();
    const isBlocked = !!user.isBlocked || status === "blocked";
    if (isBlocked) {
      return res.status(403).json({ success: false, message: "Account blocked" });
    }

    // ✅ ensure not admin accidentally
    if (String(user.role || "").toLowerCase() === "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = user;
    req.userId = String(user._id);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
