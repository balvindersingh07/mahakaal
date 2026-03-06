// src/routes/transactions.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const Transaction = require("../models/Transaction");

function normLower(v) {
  return String(v || "").trim().toLowerCase();
}

// de-dup strategy:
// For PaymentRequest: keep ONLY ONE row per (refType, refId) preferring:
//   success > pending > failed
// This prevents "double statement row" when wallet.service also created a success txn.
function dedupeTransactions(rows = []) {
  const rank = (t) => {
    const s = normLower(t.status);
    if (s === "success") return 3;
    if (s === "pending") return 2;
    if (s === "failed") return 1;
    return 0;
  };

  const map = new Map();

  for (const t of rows) {
    const refType = String(t.refType || "");
    const refId = t.refId ? String(t.refId) : "";

    // only dedupe for linked refs (PaymentRequest most important)
    const key =
      refType && refId ? `${refType}:${refId}` : null;

    if (!key) continue;

    const prev = map.get(key);
    if (!prev) {
      map.set(key, t);
      continue;
    }

    // keep better status
    if (rank(t) > rank(prev)) map.set(key, t);
    else if (rank(t) === rank(prev)) {
      // tie-breaker: keep latest
      const ta = new Date(t.createdAt || 0).getTime();
      const pa = new Date(prev.createdAt || 0).getTime();
      if (ta > pa) map.set(key, t);
    }
  }

  // now rebuild list:
  // - keep all non-linked txns
  // - for linked ones, keep chosen per key
  const chosenKeys = new Set(map.keys());
  const chosenIds = new Set([...map.values()].map((x) => String(x._id)));

  const out = [];
  for (const t of rows) {
    const refType = String(t.refType || "");
    const refId = t.refId ? String(t.refId) : "";
    const key = refType && refId ? `${refType}:${refId}` : null;

    if (!key) {
      out.push(t);
      continue;
    }

    // include only the chosen txn for this ref
    if (chosenKeys.has(key) && chosenIds.has(String(t._id))) out.push(t);
  }

  // keep original sort order (already createdAt desc in query)
  return out;
}

router.get("/transactions", auth, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const pageRaw = Number(req.query.page);
    const daysRaw = req.query.days != null ? Number(req.query.days) : null;

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const skip = (page - 1) * limit;

    const q = { user: req.user._id };

    // optional filters (normalize)
    if (req.query.status) q.status = normLower(req.query.status); // pending/success/failed
    if (req.query.type) q.type = normLower(req.query.type); // credit/debit

    // days filter (createdAt)
    if (Number.isFinite(daysRaw) && daysRaw > 0) {
      const now = new Date();
      const from = new Date(now.getTime() - daysRaw * 24 * 60 * 60 * 1000);
      q.createdAt = { $gte: from, $lte: now };
    }

    // NOTE: We intentionally fetch a bit extra for stable dedupe in-page
    const fetchLimit = Math.min(limit * 2, 500);

    let rows = await Transaction.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(fetchLimit)
      .lean();

    // ✅ de-dup linked refs (PaymentRequest etc.)
    rows = dedupeTransactions(rows);

    // return only requested limit after dedupe
    rows = rows.slice(0, limit);

    return res.json({
      success: true,
      rows,
      items: rows,
      transactions: rows,
      page,
      limit,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Transactions fetch failed",
      error: err?.message || String(err),
    });
  }
});

module.exports = router;
