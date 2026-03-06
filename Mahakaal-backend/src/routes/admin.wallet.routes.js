// src/routes/admin.wallet.routes.js
const router = require("express").Router();
const mongoose = require("mongoose");
const adminAuth = require("../middleware/adminAuth");

const User = require("../models/User");
const { applyWalletTxn } = require("../services/wallet.service");

/**
 * Helper: find user by id OR phone
 * payload supports:
 *  - userId
 *  - phone
 */
async function resolveUserId({ userId, phone }) {
  const uid = String(userId || "").trim();

  // ✅ strict ObjectId check
  if (uid && mongoose.Types.ObjectId.isValid(uid)) {
    const u = await User.findById(uid).select("_id").lean().catch(() => null);
    if (u?._id) return String(u._id);
  }

  const digits = String(phone || userId || "")
    .replace(/\D/g, "")
    .slice(-10);

  if (!digits) return null;

  const u = await User.findOne({ phone: digits }).select("_id").lean().catch(() => null);
  return u?._id ? String(u._id) : null;
}

function getClientIp(req) {
  return (
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

/**
 * POST /api/admin/wallet/add
 * body: { userId, phone, amount, note }
 */
router.post("/wallet/add", adminAuth, async (req, res) => {
  try {
    const { userId, phone, amount, note = "" } = req.body || {};

    const uid = await resolveUserId({ userId, phone });
    if (!uid) return res.status(404).json({ success: false, message: "User not found" });

    const amt = Number(amount || 0);
    if (!(amt > 0)) return res.status(400).json({ success: false, message: "amount must be > 0" });

    // ✅ IMPORTANT: give each admin op a unique refId so it is traceable + safe
    const opId = new mongoose.Types.ObjectId();

    const out = await applyWalletTxn({
      userId: uid,
      type: "credit",
      reason: "admin_add",
      amount: amt,
      refType: "AdminWallet",
      refId: opId, // ✅ was null (bad)
      meta: {
        note,
        adminId: req.adminId || req.admin?.adminId || req.user?._id || "admin",
        ip: getClientIp(req),
      },
    });

    const bal = out?.wallet ?? out?.user?.wallet ?? null;

    return res.json({
      success: true,
      ok: true,
      wallet: bal,
      balance: bal,
      txn: out?.txn,
      transaction: out?.txn,
      opId: String(opId),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Wallet add failed" });
  }
});

/**
 * POST /api/admin/wallet/withdraw
 * body: { userId, phone, amount, note }
 */
router.post("/wallet/withdraw", adminAuth, async (req, res) => {
  try {
    const { userId, phone, amount, note = "" } = req.body || {};

    const uid = await resolveUserId({ userId, phone });
    if (!uid) return res.status(404).json({ success: false, message: "User not found" });

    const amt = Number(amount || 0);
    if (!(amt > 0)) return res.status(400).json({ success: false, message: "amount must be > 0" });

    // ✅ IMPORTANT: unique refId per admin op
    const opId = new mongoose.Types.ObjectId();

    let out;
    try {
      out = await applyWalletTxn({
        userId: uid,
        type: "debit",
        reason: "admin_withdraw",
        amount: amt,
        refType: "AdminWallet",
        refId: opId, // ✅ was null (bad)
        meta: {
          note,
          adminId: req.adminId || req.admin?.adminId || req.user?._id || "admin",
          ip: getClientIp(req),
        },
      });
    } catch (err) {
      const msg = err?.message || "Withdraw failed";
      return res.status(400).json({ success: false, message: msg });
    }

    const bal = out?.wallet ?? out?.user?.wallet ?? null;

    return res.json({
      success: true,
      ok: true,
      wallet: bal,
      balance: bal,
      txn: out?.txn,
      transaction: out?.txn,
      opId: String(opId),
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Wallet withdraw failed" });
  }
});

module.exports = router;
