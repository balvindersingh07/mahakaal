// src/routes/admin.reports.routes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");

const Bet = require("../models/Bet");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Commission = require("../models/Commission");

function safeDate(x) {
  const d = new Date(String(x || ""));
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * GET /api/admin/user/:id/summary
 */
router.get("/user/:id/summary", adminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const user = await User.findById(id)
      .select("username phone wallet status isBlocked createdAt")
      .lean();

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const [totalBets, pending, won, lost, refunded] = await Promise.all([
      Bet.countDocuments({ user: id }),
      Bet.countDocuments({ user: id, status: "pending" }),
      Bet.countDocuments({ user: id, status: "won" }),
      Bet.countDocuments({ user: id, status: "lost" }),
      Bet.countDocuments({ user: id, status: "refunded" }),
    ]);

    const sumAgg = await Bet.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          stake: { $sum: "$total" },
          winAmount: { $sum: "$winAmount" },
        },
      },
    ]);

    const stake = Number(sumAgg?.[0]?.stake || 0);
    const winAmount = Number(sumAgg?.[0]?.winAmount || 0);

    const summary = {
      user,
      wallet: user.wallet ?? null,
      bets: { totalBets, pending, won, lost, refunded },
      totals: { stake, winAmount },
    };

    return res.json({
      success: true,
      summary,
      rows: [summary],
      items: [summary],
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Summary failed" });
  }
});

/**
 * GET /api/admin/bet-report?gameId=&from=&to=
 * Returns number-wise grouped data for admin grid
 *
 * gameId is matched case-insensitively against both gameId (slug) and gameName
 * so frontend can send DISAWAR or disawar or Disawar — all work
 */
router.get("/bet-report", adminAuth, async (req, res) => {
  try {
    const { gameId, from, to } = req.query || {};
    if (!gameId)
      return res.status(400).json({ success: false, message: "gameId required" });

    const fromD = safeDate(from);
    const toD = safeDate(to);

    // Convert to slug format: lowercase, spaces/special chars -> underscore
    function toSlug(v) {
      return String(v || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    const gidRaw = String(gameId).trim();
    const gidSlug = toSlug(gidRaw);
    const gidUpper = gidRaw.toUpperCase();

    // Match by slug (stored value) OR gameName (case-insensitive)
    const gameIdMatch = {
      $or: [
        { gameId: gidSlug },
        { gameId: gidRaw },
        { gameId: new RegExp(`^${gidSlug}$`, "i") },
        { gameName: new RegExp(`^${gidRaw}$`, "i") },
        { gameName: new RegExp(`^${gidUpper}$`, "i") },
      ],
    };

    const match = { ...gameIdMatch };

    if (fromD && toD) {
      match.createdAt = { $gte: fromD, $lte: toD };
    }

    const data = await Bet.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            type: "$items.type",
            key: "$items.key",
          },
          amount: { $sum: "$items.amount" },
          bets: { $sum: 1 },
        },
      },
    ]);

    const jn = [];
    const andar = [];
    const bahar = [];

    for (const row of data) {
      const { type, key } = row._id;

      // num, crossing, no-to-no all go into jn (Jantri + Notono) grid
      if (type === "num" || type === "no-to-no" || type === "crossing") {
        jn.push({ number: key, amount: row.amount, bets: row.bets });
      }

      if (type === "andar") {
        andar.push({ digit: key, amount: row.amount, bets: row.bets });
      }

      if (type === "bahar") {
        bahar.push({ digit: key, amount: row.amount, bets: row.bets });
      }
    }

    return res.json({
      success: true,
      gameId: gidSlug,
      jn,
      andar,
      bahar,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Bet report failed" });
  }
});

/**
 * GET /api/admin/combined
 *
 * Returns:
 *  - stats: { usersTotal, usersNew, betsTotal, betsRecent, txRecent }
 *  - today: game-wise bet totals for today (IST dateKey)
 *  - month: day-wise bet totals for current month
 */
router.get("/combined", adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const last2Days = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // IST dateKey helpers
    function istNow() {
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      return new Date(utc + 330 * 60000);
    }
    const ist = istNow();
    const todayKey = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(
      ist.getDate()
    ).padStart(2, "0")}`;

    // Current day + month range (IST)
    const todayStart = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(ist.getFullYear(), ist.getMonth(), ist.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(ist.getFullYear(), ist.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(ist.getFullYear(), ist.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthStartKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEndKey = todayKey;

    const [
      usersTotal,
      usersNew,
      betsTotal,
      betsRecent,
      txRecent,
      todayAgg,
      monthAgg,
      todayProfitAgg,
      monthProfitAgg,
      todayCommAgg,
      monthCommAgg,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: last2Days, $lte: now } }),
      Bet.countDocuments({}),
      Bet.countDocuments({ createdAt: { $gte: last2Days, $lte: now } }),
      Transaction.countDocuments({ createdAt: { $gte: last2Days, $lte: now } }),

      // Today: group by gameId
      Bet.aggregate([
        { $match: { dateKey: todayKey } },
        { $group: { _id: "$gameId", amount: { $sum: "$total" }, bets: { $sum: 1 } } },
      ]),

      // This month: group by dateKey
      Bet.aggregate([
        { $match: { dateKey: { $gte: monthStartKey, $lte: monthEndKey } } },
        { $group: { _id: "$dateKey", amount: { $sum: "$total" }, bets: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Today profit (stake vs win payouts)
      Bet.aggregate([
        { $match: { dateKey: todayKey } },
        {
          $group: {
            _id: null,
            stake: { $sum: "$total" },
            winAmount: { $sum: "$winAmount" },
          },
        },
      ]),

      // Month profit (stake vs win payouts)
      Bet.aggregate([
        { $match: { dateKey: { $gte: monthStartKey, $lte: monthEndKey } } },
        {
          $group: {
            _id: null,
            stake: { $sum: "$total" },
            winAmount: { $sum: "$winAmount" },
          },
        },
      ]),

      // Referral commissions (today, by createdAt IST range)
      Commission.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: "$amount" },
          },
        },
      ]),

      // Referral commissions for whole month (same range, same aggregation)
      Commission.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const stats = { usersTotal, usersNew, betsTotal, betsRecent, txRecent };

    const todayRows = todayAgg.map((r) => ({ gameId: r._id, amount: r.amount, bets: r.bets }));
    const todayTotal = todayRows.reduce((s, r) => s + r.amount, 0);

    const monthRows = monthAgg.map((r) => ({ date: r._id, amount: r.amount, bets: r.bets }));
    const monthTotal = monthRows.reduce((s, r) => s + r.amount, 0);

    const todayStake = Number(todayProfitAgg?.[0]?.stake || 0);
    const todayWin = Number(todayProfitAgg?.[0]?.winAmount || 0);
    const monthStake = Number(monthProfitAgg?.[0]?.stake || 0);
    const monthWin = Number(monthProfitAgg?.[0]?.winAmount || 0);

    const todayCommissionTotal = Number(todayCommAgg?.[0]?.amount || 0);
    const monthCommissionTotal = Number(monthCommAgg?.[0]?.amount || 0);

    const todayGrossProfit = todayStake - todayWin;
    const monthGrossProfit = monthStake - monthWin;

    const todayNetProfit = todayGrossProfit - todayCommissionTotal;
    const monthNetProfit = monthGrossProfit - monthCommissionTotal;

    return res.json({
      success: true,
      stats,
      combined: stats,
      today: { rows: todayRows, total: todayTotal },
      month: { rows: monthRows, total: monthTotal },
      profit: {
        today: {
          stake: todayStake,
          win: todayWin,
          commission: todayCommissionTotal,
          gross: todayGrossProfit,
          net: todayNetProfit,
        },
        month: {
          stake: monthStake,
          win: monthWin,
          commission: monthCommissionTotal,
          gross: monthGrossProfit,
          net: monthNetProfit,
        },
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e?.message || "Combined failed" });
  }
});

module.exports = router;