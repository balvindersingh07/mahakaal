// src/middleware/adminAuth.js
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = async function adminAuth(req, res, next) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "JWT_SECRET missing" });
    }

    // ✅ support both lowercase/uppercase headers
    const authHeader =
      (req.headers.authorization || req.headers.Authorization || "").toString().trim();

    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

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

    const isAdmin =
      decoded?.role === "admin" ||
      decoded?.isAdmin === true ||
      decoded?.admin === true;

    if (!decoded || !isAdmin) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    // ✅ normalize possible id keys
    const adminIdRaw =
      decoded?.id ||
      decoded?._id ||
      decoded?.adminId ||
      decoded?.uid ||
      decoded?.sub ||
      null;

    const adminId = adminIdRaw != null ? String(adminIdRaw) : "";

    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ prevent CastError
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ DB verify (prevents forged admin claims)
    const adminUser = await User.findById(adminId).select("-password").lean();
    if (!adminUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const role = String(adminUser.role || "").toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const status = String(adminUser.status || "").toLowerCase();
    const isBlocked = status === "blocked" || !!adminUser.isBlocked;
    if (isBlocked) {
      return res.status(403).json({ success: false, message: "Account blocked" });
    }

    // ✅ Attach fields used across routes (compat)
    req.admin = decoded;
    req.adminId = String(adminUser._id);

    req.user = {
      ...adminUser, // so routes can read req.user.wallet/phone if needed
      _id: adminUser._id,
      role: "admin",
    };

    req.userId = String(adminUser._id);

    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
