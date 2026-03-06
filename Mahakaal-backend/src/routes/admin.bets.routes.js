// src/routes/admin.bets.routes.js
const router = require("express").Router();
const mongoose = require("mongoose");
const adminAuth = require("../middleware/adminAuth");
const Bet = require("../models/Bet");
const User = require("../models/User");

// normalize status input -> BetSchema enum: pending | won | lost | refunded
function normalizeStatus(s) {
  const v = String(s || "").trim().toLowerCase();
  if (!v) return "";
  if (["win", "won"].includes(v)) return "won";
  if (["loss", "lose", "lost"].includes(v)) return "lost";
  if (["pending"].includes(v)) return "pending";
  if (["refund", "refunded"].includes(v)) return "refunded";
  return v; // if already correct
}

function safeDate(x) {
  const d = new Date(String(x || ""));
  return Number.isFinite(d.getTime()) ? d : null;
}

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function isDateKey(v) {
  // YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

/**
 * GET /api/admin/bets
 * Supports:
 * - phone=########## (exact or partial ending)
 * - from=ISO
 * - to=ISO
 * - status=pending|won|lost|refunded (or win/loss)
 * - gameId=
 * - userId= (ObjectId)
 * - dateKey=YYYY-MM-DD
 * - page=1
 * - limit=200 (max 500)
 *
 * Default: last 2 days (createdAt) IF no dateKey given.
 */
router.get("/bets", adminAuth, async (req, res) => {
  try {
    const { status, gameId, userId, dateKey, phone, from, to } = req.query || {};

    // pagination
    const limitRaw = Number(req.query.limit);
    const pageRaw = Number(req.query.page);

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const skip = (page - 1) * limit;

    const q = {};

    // --------------------
    // DateKey filter (preferred if provided)
    // --------------------
    const dk = String(dateKey || "").trim();
    const hasDateKey = dk && isDateKey(dk);
    if (hasDateKey) q.dateKey = dk;

    // --------------------
    // Date range filter (createdAt)
    // - If dateKey NOT provided: default last 2 days
    // - If dateKey provided: only apply createdAt when from/to explicitly passed
    // --------------------
    const hasFrom = from != null && String(from).trim() !== "";
    const hasTo = to != null && String(to).trim() !== "";

    const now = new Date();

    let fromD = safeDate(from);
    let toD = safeDate(to);

    if (!hasDateKey) {
      // default last 48h
      if (!fromD) fromD = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      if (!toD) toD = now;
      // swap if reversed
      if (fromD > toD) {
        const tmp = fromD;
        fromD = toD;
        toD = tmp;
      }
      q.createdAt = { $gte: fromD, $lte: toD };
    } else if (hasFrom || hasTo) {
      // optional createdAt window even with dateKey (if explicitly asked)
      if (!fromD) fromD = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      if (!toD) toD = now;
      if (fromD > toD) {
        const tmp = fromD;
        fromD = toD;
        toD = tmp;
      }
      q.createdAt = { $gte: fromD, $lte: toD };
    }

    // --------------------
    // Optional filters
    // --------------------
    if (status) {
      const ns = normalizeStatus(status);
      if (ns) q.status = ns;
    }

    if (gameId != null && String(gameId).trim() !== "") {
      q.gameId = String(gameId).trim();
    }

    // --------------------
    // user filter by id
    // --------------------
    const uidRaw = userId ? String(userId).trim() : "";
    if (uidRaw) {
      if (!mongoose.Types.ObjectId.isValid(uidRaw)) {
        return res.json({
          success: true,
          rows: [],
          bets: [],
          items: [],
          page,
          limit,
        });
      }
      q.user = uidRaw;
    }

    // --------------------
    // phone filter -> find user -> overrides q.user
    // --------------------
    if (phone) {
      const ph = onlyDigits(phone).trim();
      const last10 = ph.length > 10 ? ph.slice(-10) : ph;

      let u = null;

      // exact match by last 10
      if (last10) {
        u = await User.findOne({ phone: last10 }).select("_id").lean();
      }

      // fallback: endsWith partial digits
      if (!u?._id && ph) {
        // digits-only input, safe in regex
        const rx = new RegExp(`${ph}$`);
        u = await User.findOne({ phone: { $regex: rx } }).select("_id").lean();
      }

      if (!u?._id) {
        return res.json({
          success: true,
          rows: [],
          bets: [],
          items: [],
          page,
          limit,
        });
      }

      q.user = u._id;
    }

    // --------------------
    // Query
    // --------------------
    const rows = await Bet.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username phone wallet")
      .lean();

    return res.json({
      success: true,
      rows,
      bets: rows,
      items: rows,
      page,
      limit,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Server error",
    });
  }
});

module.exports = router;
