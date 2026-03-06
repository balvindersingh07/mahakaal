// src/controllers/winnings.controller.js
const mongoose = require("mongoose");
const Bet = require("../models/Bet");

const N = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * GET /api/winnings
 * User winnings history (only WON bets)
 *
 * Query:
 *  - limit, page
 *  - days (optional)
 *
 * Returns (frontend-safe):
 *  - rows / items / winnings
 *  - totalWinPage (sum of returned rows)
 *  - totalWinAll (sum across all matching rows; best-effort)
 */
exports.myWinnings = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const limitRaw = Number(req.query.limit);
    const pageRaw = Number(req.query.page);
    const daysRaw = req.query.days != null ? Number(req.query.days) : null;

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const skip = (page - 1) * limit;

    const q = {
      user: userId,
      status: "won",
      winAmount: { $gt: 0 },
    };

    // optional days filter (createdAt)
    if (Number.isFinite(daysRaw) && daysRaw > 0) {
      const now = new Date();
      const from = new Date(now.getTime() - daysRaw * 24 * 60 * 60 * 1000);
      q.createdAt = { $gte: from, $lte: now };
    }

    const rows = await Bet.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // page sum
    const totalWinPage = rows.reduce((sum, b) => sum + N(b.winAmount), 0);

    // all sum (best-effort)
    let totalWinAll = null;
    try {
      const agg = await Bet.aggregate([
        { $match: q },
        { $group: { _id: null, sum: { $sum: "$winAmount" } } },
      ]);
      totalWinAll = N(agg?.[0]?.sum);
    } catch {
      // ignore aggregation errors
    }

    return res.json({
      success: true,
      totalWin: totalWinPage,      // ✅ keep old key for compatibility
      totalWinPage,                // ✅ new (optional)
      totalWinAll,                 // ✅ new (optional)
      rows,
      items: rows,
      winnings: rows,
      page,
      limit,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Winnings fetch failed",
      error: e?.message || String(e),
    });
  }
};
