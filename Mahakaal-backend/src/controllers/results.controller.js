// src/controllers/results.controller.js

const Result = require("../models/Result");
const Bet = require("../models/Bet");
const User = require("../models/User");
const Commission = require("../models/Commission");
const ReferralConfig = require("../models/ReferralConfig");
const { applyWalletTxn } = require("../services/wallet.service");

/* ================= IST HELPERS ================= */

const istNow = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 330 * 60000);
};

const dateKeyIST = () => {
  const d = istNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const normType = (t) => {
  const s = String(t || "main").toLowerCase().trim();
  if (["open", "close", "main"].includes(s)) return s;
  return "main";
};

const normResult = (v) =>
  String(v ?? "")
    .trim()
    .padStart(2, "0")
    .slice(-2);

/* ================= USER SIDE ================= */

exports.listResults = async (req, res) => {
  try {
    const { gameId, dateKey, type } = req.query || {};
    const q = {};
    if (gameId) q.gameId = String(gameId);
    if (dateKey) q.dateKey = String(dateKey);
    if (type) q.type = normType(type);

    const rows = await Result.find(q)
      .sort({ dateKey: -1, createdAt: -1 })
      .lean();

    return res.json({ success: true, rows });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Results fetch failed",
    });
  }
};

/* ================= ADMIN SIDE ================= */

exports.adminSetResult = async (req, res) => {
  try {
    const body = req.body || {};

    const gameId = String(body.gameId || "").trim();
    const dateKey = String(body.dateKey || dateKeyIST()).trim();
    const type = normType(body.type);
    const result = normResult(body.result);

    if (!gameId)
      return res.status(400).json({ success: false, message: "gameId required" });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))
      return res.status(400).json({ success: false, message: "Invalid dateKey" });

    if (!/^\d{2}$/.test(result))
      return res.status(400).json({ success: false, message: "Invalid result" });

    // ❌ Prevent overwrite
    const existing = await Result.findOne({ gameId, dateKey, type });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Result already declared and locked",
      });
    }

    // ✅ Save result
    const row = await Result.create({
      gameId,
      dateKey,
      type,
      result,
      declaredBy: req.user?._id || null,
    });

    /* ===========================
       WINNER PROCESSING
    ============================ */

    const bets = await Bet.find({
      gameId,
      dateKey,
      status: "pending",
    });

    let winCount = 0;

    // Load referral config (singleton) once
    let refCfg = await ReferralConfig.findOne().lean();
    if (!refCfg) {
      refCfg = { enabled: true, ratePercent: 2 };
    }
    const refEnabled = refCfg.enabled !== false;
    const refRatePct = Number.isFinite(Number(refCfg.ratePercent))
      ? Number(refCfg.ratePercent)
      : 2;
    const refRate = refEnabled && refRatePct > 0 ? refRatePct / 100 : 0;

    // Preload users for referral mapping
    const userIds = Array.from(
      new Set(bets.map((b) => String(b.user || "")).filter(Boolean))
    );
    const users = await User.find({ _id: { $in: userIds } })
      .select("_id referredBy")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    for (const bet of bets) {
      let winAmount = 0;

      for (const item of bet.items || []) {
        if (item.num === result) {
          winAmount += item.amount * 10; // adjust multiplier
        }
      }

      if (winAmount > 0) {
        const winTxn = await applyWalletTxn({
          userId: bet.user,
          type: "credit",
          amount: winAmount,
          reason: "bet_win",
          refType: "BetWin",
          refId: bet._id,
        });

        bet.status = "won";
        bet.winAmount = winAmount;
        bet.resultValue = result;
        if (winTxn?.txn?._id) {
          bet.winTxnId = winTxn.txn._id;
        }
        winCount++;
      } else {
        bet.status = "lost";
        bet.winAmount = 0;
        bet.resultValue = result;
      }

      // ✅ Apply referral commission from operator PROFIT on this bet
      if (refRate > 0 && Number.isFinite(Number(bet.total))) {
        const profit = Math.max(0, Number(bet.total || 0) - Number(bet.winAmount || 0));
        if (profit > 0) {
          const u = userMap.get(String(bet.user));
          const referrerId = u?.referredBy;

          if (referrerId) {
            const amount = profit * refRate;

            if (amount > 0) {
              await Commission.create({
                user: referrerId,
                fromUser: bet.user,
                bet: bet._id,
                amount,
                rate: refRate,
                status: "pending",
              });
            }
          }
        }
      }

      await bet.save();
    }

    return res.json({
      success: true,
      result: row,
      processedBets: bets.length,
      winners: winCount,
    });
  } catch (e) {
    console.error("adminSetResult error:", e);
    return res.status(500).json({
      success: false,
      message: "Result declaration failed",
    });
  }
};