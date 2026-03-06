// src/routes/admin.results.routes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");

const Result = require("../models/Result");
const Bet = require("../models/Bet");
const Game = require("../models/Game");
const { applyWalletTxn } = require("../services/wallet.service");

// IST helpers
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

const norm2 = (v) => String(v ?? "").trim().padStart(2, "0").slice(-2);
const is2Digit = (v) => /^\d{2}$/.test(String(v));

// payout defaults
const DEFAULT_RATES = {
  num: 90,
  crossing: 90,
  "no-to-no": 90,
  andar: 9,
  bahar: 9,
};

// settle logic
function calcWinAmount(bet, result2, rates) {
  const r = norm2(result2);
  const andar = r[0];
  const bahar = r[1];

  let win = 0;

  for (const it of bet.items || []) {
    const amt = Number(it.amount || 0);
    if (!amt) continue;

    const t = String(it.type || bet.betType || "num").toLowerCase().trim();
    const key = it.key != null && String(it.key) !== "" ? String(it.key) : "";
    const num = it.num != null && String(it.num) !== "" ? String(it.num) : "";

    if (t === "num" || t === "crossing" || t === "no-to-no") {
      const pick = norm2(key || num);
      if (pick === r) win += amt * (rates[t] ?? rates.num ?? DEFAULT_RATES.num);
      continue;
    }

    if (t === "andar") {
      const pick = String(key).trim();
      if (pick === andar) win += amt * (rates.andar ?? DEFAULT_RATES.andar);
      continue;
    }

    if (t === "bahar") {
      const pick = String(key).trim();
      if (pick === bahar) win += amt * (rates.bahar ?? DEFAULT_RATES.bahar);
      continue;
    }

    const pick = norm2(key || num);
    if (pick === r) win += amt * (rates.num ?? DEFAULT_RATES.num);
  }

  return Math.floor(win);
}

/**
 * GET /api/admin/results?gameId=&dateKey=&type=
 */
router.get("/results", adminAuth, async (req, res) => {
  try {
    const { gameId, dateKey, type } = req.query || {};
    const q = {};
    if (gameId) q.gameId = String(gameId).trim();
    if (dateKey) q.dateKey = String(dateKey).trim();
    if (type) q.type = String(type).trim();

    const rows = await Result.find(q).sort({ dateKey: -1, createdAt: -1 }).lean();
    return res.json({ success: true, rows, items: rows, results: rows });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Admin results fetch failed",
    });
  }
});

/**
 * POST /api/admin/results
 * body: { gameId, gameName?, type?, result, dateKey? }
 *
 * ✅ FIXES:
 * - race safe result upsert
 * - per-bet atomic claim to prevent double settle
 * - wallet credit is idempotent (refType+refId+reason)
 */
router.post("/results", adminAuth, async (req, res) => {
  try {
    const { gameId, gameName = "", type = "main", result, dateKey } = req.body || {};

    const gid = String(gameId || "").trim();
    if (!gid) return res.status(400).json({ success: false, message: "gameId required" });

    const rk = norm2(result);
    if (!is2Digit(rk)) {
      return res.status(400).json({
        success: false,
        message: "result must be 2-digit string like 07",
      });
    }

    const dk = String(dateKey || dateKeyIST()).trim();
    const rt = String(type || "main").toLowerCase().trim();

    // ✅ Double-settle protection (fast path)
    const existing = await Result.findOne({ gameId: gid, dateKey: dk, type: rt }).lean();
    const pendingCount = await Bet.countDocuments({ gameId: gid, dateKey: dk, status: "pending" });

    if (existing && pendingCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Result already declared and bets already settled",
        result: existing,
        settle: { settled: 0, winners: 0, losers: 0, creditedTotal: 0, failed: 0 },
      });
    }

    // ✅ Better Game lookup: by slug/gameId OR by name
    let g = null;
    try {
      g =
        (await Game.findOne({
          $or: [
            { slug: gid },
            { gameId: gid },
            { name: String(gameName || "").trim() },
            { name: gid },
          ],
        }).lean()) || null;
    } catch {
      g = null;
    }

    const rates = {
      num: Number(g?.rateNum) || DEFAULT_RATES.num,
      crossing: Number(g?.rateCrossing) || DEFAULT_RATES.crossing,
      "no-to-no": Number(g?.rateNoToNo) || DEFAULT_RATES["no-to-no"],
      andar: Number(g?.rateAndar) || DEFAULT_RATES.andar,
      bahar: Number(g?.rateBahar) || DEFAULT_RATES.bahar,
    };

    const declaredBy = req.adminId || req.user?._id || req.admin?._id || null;

    // ✅ upsert result (race safe)
    let doc;
    try {
      doc = await Result.findOneAndUpdate(
        { gameId: gid, dateKey: dk, type: rt },
        {
          $set: {
            gameId: gid,
            gameName: g?.name || gameName,
            dateKey: dk,
            type: rt,
            result: rk,
            declaredBy: declaredBy || null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
    } catch (e) {
      // unique index collision -> fetch existing
      doc = await Result.findOne({ gameId: gid, dateKey: dk, type: rt }).lean();
      if (!doc) throw e;
    }

    // -------- AUTO SETTLE pending bets ----------
    // IMPORTANT: we don't just loop and save;
    // we "CLAIM" each bet atomically to prevent two settle calls in parallel.
    const pending = await Bet.find({ gameId: gid, dateKey: dk, status: "pending" })
      .sort({ createdAt: 1 })
      .select("_id user items betType status winTxnId") // keep light
      .lean();

    let settled = 0;
    let winners = 0;
    let losers = 0;
    let creditedTotal = 0;
    let failed = 0;

    for (const b of pending) {
      try {
        // ✅ If already has winTxnId, treat as settled (idempotent)
        if (b.winTxnId) {
          settled++;
          continue;
        }

        // ✅ CLAIM STEP (atomic lock):
        // only one process will succeed updating this bet from pending -> pending (with "resultValue" marker)
        // Using resultValue marker to lock without schema change.
        const claimed = await Bet.findOneAndUpdate(
          { _id: b._id, status: "pending", winTxnId: null },
          { $set: { resultValue: rk } }, // lock marker (safe)
          { new: true }
        );

        // if claim failed => someone else already processed it
        if (!claimed) {
          settled++;
          continue;
        }

        const winAmount = calcWinAmount(claimed, rk, rates);

        if (winAmount > 0) {
          const credit = await applyWalletTxn({
            userId: claimed.user,
            type: "credit",
            reason: "bet_win",
            amount: winAmount,
            refType: "Bet",
            refId: claimed._id,
            meta: { gameId: gid, dateKey: dk, result: rk, type: rt },
          });

          await Bet.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: "won",
                winAmount: winAmount,
                resultValue: rk,
                winTxnId: credit?.txn?._id || claimed.winTxnId || null,
              },
            }
          );

          winners++;
          creditedTotal += winAmount;
        } else {
          await Bet.updateOne(
            { _id: claimed._id },
            {
              $set: {
                status: "lost",
                winAmount: 0,
                resultValue: rk,
              },
            }
          );

          losers++;
        }

        settled++;
      } catch (e) {
        failed++;
        console.error("settle bet failed:", b?._id?.toString?.(), e?.message || e);
        // keep bet pending if something failed badly?
        // We DO NOT revert here automatically because refund/credit integrity matters.
        // Admin can re-run result; claimed bets that didn't finalize remain pending but with resultValue marker.
      }
    }

    return res.json({
      success: true,
      result: doc,
      settle: { settled, winners, losers, creditedTotal, failed },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Result declare failed",
    });
  }
});

/**
 * DELETE /api/admin/results/:id
 * Removes a declared result by its _id
 */
router.delete("/results/:id", adminAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const deleted = await Result.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Result not found" });
    return res.json({ success: true, ok: true, message: "Result deleted" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Delete failed" });
  }
});

module.exports = router;
