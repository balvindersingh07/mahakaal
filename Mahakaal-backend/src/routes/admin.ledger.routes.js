// src/routes/admin.ledger.routes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");

const Transaction = require("../models/Transaction");
const User = require("../models/User");
const mongoose = require("mongoose");

/**
 * Admin Payment History / Ledger
 * GET /api/admin/ledger
 *
 * Filters:
 *  - phone=########## (supports +91 / spaces)
 *  - userId=<ObjectId>
 *  - from=ISO
 *  - to=ISO
 *  - type=credit|debit
 *  - reason=bet_win|bet_place|payment_add_approved|...
 * Pagination:
 *  - page=1
 *  - limit=200 (max 500)
 *
 * Response shapes (frontend-safe):
 *  { success, rows, items, ledger, page, limit }
 */

function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function safeDate(v) {
  const d = new Date(v);
  return isValidDate(d) ? d : null;
}

function normPhone(v) {
  return String(v || "").replace(/\D/g, "").slice(-10);
}

router.get("/ledger", adminAuth, async (req, res) => {
  try {
    const { phone, userId, from, to, type, reason } = req.query || {};

    // pagination
    const limitRaw = Number(req.query.limit);
    const pageRaw = Number(req.query.page);

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const skip = (page - 1) * limit;

    const q = {};

    // --------------------
    // Resolve user filter
    // --------------------
    let uid = userId ? String(userId).trim() : "";

    if (uid && !mongoose.Types.ObjectId.isValid(uid)) {
      // invalid userId -> return empty safely (no crash)
      return res.json({ success: true, rows: [], items: [], ledger: [], page, limit });
    }

    if (!uid && phone) {
      const digits = normPhone(phone);
      if (digits) {
        const u = await User.findOne({ phone: digits }).select("_id").lean();
        if (!u?._id) {
          return res.json({ success: true, rows: [], items: [], ledger: [], page, limit });
        }
        uid = String(u._id);
      }
    }

    if (uid) q.user = uid;

    // --------------------
    // Date range (default 2 days)
    // --------------------
    const now = new Date();
    let fromDate = safeDate(from) || new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    let toDate = safeDate(to) || now;

    // If someone passes from > to, swap safely
    if (fromDate > toDate) {
      const tmp = fromDate;
      fromDate = toDate;
      toDate = tmp;
    }

    q.createdAt = { $gte: fromDate, $lte: toDate };

    // --------------------
    // Optional filters
    // --------------------
    if (type) {
      const t = String(type).toLowerCase().trim();
      if (t === "credit" || t === "debit") q.type = t;
    }

    if (reason) q.reason = String(reason).trim();

    // --------------------
    // Query (lean + safe populate)
    // --------------------
    const rows = await Transaction.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username phone wallet")
      .lean();

    return res.json({
      success: true,
      rows,
      items: rows,
      ledger: rows,
      page,
      limit,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Ledger fetch failed",
    });
  }
});

module.exports = router;
