// src/routes/bets.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const { placeBet, myBets, todayBets } = require("../controllers/bets.controller");

/**
 * ✅ Anti double-submit (no new packages)
 * Prevents rapid duplicate POST /bets from SAME USER within a short window.
 * - Does NOT change request/response shape
 * - Helps avoid accidental double bet due to double tap / retry
 *
 * NOTE: placeBet controller already has requestHash idempotency.
 * This layer just blocks ultra-fast double taps before controller runs.
 */
const recentBetHits = new Map(); // key -> timestamp

function antiDoubleSubmit(windowMs = 1500) {
  return (req, res, next) => {
    // ✅ compatible with multiple auth implementations
    const uid =
      req.user?._id?.toString?.() ||
      req.user?.id?.toString?.() ||
      req.userId?.toString?.() ||
      "anon";

    // stable key (no query noise)
    const routeKey = `${req.baseUrl || ""}${req.path || req.originalUrl || ""}`;
    const key = `${uid}:POST:${routeKey}`;

    const now = Date.now();
    const last = recentBetHits.get(key) || 0;

    if (now - last < windowMs) {
      return res.status(429).json({
        success: false,
        message: "Please wait a moment",
      });
    }

    recentBetHits.set(key, now);

    // auto cleanup (avoid memory leak)
    const timer = setTimeout(() => {
      const t = recentBetHits.get(key);
      if (t === now) recentBetHits.delete(key);
    }, windowMs + 200);

    timer.unref?.();
    return next();
  };
}

router.post("/bets", auth, antiDoubleSubmit(1500), placeBet);
router.get("/bets", auth, myBets);
router.get("/bets/today", auth, todayBets);

module.exports = router;
