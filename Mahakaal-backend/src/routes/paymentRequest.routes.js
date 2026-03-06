// src/routes/paymentRequest.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");

const PaymentRequest = require("../models/PaymentRequest");
const Transaction = require("../models/Transaction");

/**
 * USER ROUTES (Mount: /api)
 *
 * Goal:
 * - Create PaymentRequest
 * - Ensure EXACTLY ONE pending Transaction for statement screen
 * - No frontend changes
 */

// helper: create pending txn only if not already present for this PR
async function ensurePendingTxn({ userId, prId, txnType, amount, mode, note }) {
  // If already exists (retry/double tap), do nothing
  const exists = await Transaction.findOne({
    user: userId,
    refType: "PaymentRequest",
    refId: prId,
    status: "pending",
  })
    .select("_id")
    .lean()
    .catch(() => null);

  if (exists) return;

  await Transaction.create({
    user: userId,
    type: txnType, // credit/debit
    amount,
    reason: txnType === "credit" ? "payment_add_pending" : "payment_withdraw_pending",
    status: "pending",
    refType: "PaymentRequest",
    refId: prId,
    meta: { mode, note },
    balanceAfter: null,
  });
}

// ✅ USER: Create request -> POST /payment-requests
router.post("/payment-requests", auth, async (req, res) => {
  try {
    const { type, amount, mode = "whatsapp", note = "" } = req.body || {};

    if (!["add", "withdraw"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // ✅ Create request
    const pr = await PaymentRequest.create({
      user: req.user._id,
      type,
      amount: n,
      mode,
      note,
      status: "pending",
    });

    // ✅ Ensure PENDING transaction (idempotent)
    const txnType = type === "add" ? "credit" : "debit";
    await ensurePendingTxn({
      userId: req.user._id,
      prId: pr._id,
      txnType,
      amount: n,
      mode,
      note,
    });

    return res.json({ success: true, request: pr });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

// ✅ USER: list -> GET /payment-requests
router.get("/payment-requests", auth, async (req, res) => {
  try {
    const rows = await PaymentRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

// ✅ USER: My requests -> GET /payment-requests/my
router.get("/payment-requests/my", auth, async (req, res) => {
  try {
    const rows = await PaymentRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, requests: rows, rows });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

module.exports = router;
