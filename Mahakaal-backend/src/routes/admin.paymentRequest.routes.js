// src/routes/admin.paymentRequest.routes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");

const PaymentRequest = require("../models/PaymentRequest");
const Transaction = require("../models/Transaction");
const { applyWalletTxn } = require("../services/wallet.service");

/**
 * GET /api/admin/payment-requests?status=pending
 * Shapes: items/rows/requests
 */
router.get("/payment-requests", adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const filter = {};
    if (status) filter.status = String(status).toLowerCase();

    const list = await PaymentRequest.find(filter)
      .populate("user", "username phone wallet role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      ok: true,
      items: list,
      rows: list,
      requests: list,
    });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

// helper: find related pending txn (created at request time)
async function findPendingTxnForPR(pr) {
  if (!pr?._id) return null;

  // ✅ IMPORTANT: execute query using .exec()
  const txn = await Transaction.findOne({
    refType: "PaymentRequest",
    refId: pr._id,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .exec()
    .catch(() => null);

  return txn || null;
}

/**
 * ✅ IMPORTANT FIX:
 * If user-side already created a PENDING txn,
 * and wallet.service creates a new SUCCESS txn on approve,
 * we MERGE the wallet txn into the pending one and DELETE the extra txn.
 * This prevents double rows in statement.
 */
async function promotePendingTxnOrKeepWalletTxn({ pendingTxn, walletTxn, patch = {} }) {
  try {
    if (!pendingTxn) return walletTxn || null;

    // If walletTxn not created (rare), just mark pending
    if (!walletTxn) {
      if (patch.status) pendingTxn.status = patch.status;
      if (patch.reason) pendingTxn.reason = patch.reason;
      if (patch.meta) pendingTxn.meta = { ...(pendingTxn.meta || {}), ...(patch.meta || {}) };
      if (patch.balanceAfter !== undefined) pendingTxn.balanceAfter = patch.balanceAfter;
      await pendingTxn.save();
      return pendingTxn;
    }

    // Delete walletTxn first to reduce unique conflicts
    if (String(walletTxn._id) !== String(pendingTxn._id)) {
      await Transaction.deleteOne({ _id: walletTxn._id }).catch(() => {});
    }

    pendingTxn.status = patch.status || "success";
    pendingTxn.reason = patch.reason || walletTxn.reason || pendingTxn.reason;

    pendingTxn.type = walletTxn.type || pendingTxn.type;
    pendingTxn.amount = walletTxn.amount || pendingTxn.amount;

    pendingTxn.meta = {
      ...(pendingTxn.meta || {}),
      ...(walletTxn.meta || {}),
      ...(patch.meta || {}),
      mergedFromWalletTxn: true,
      mergedAt: new Date().toISOString(),
    };

    if (patch.balanceAfter !== undefined) pendingTxn.balanceAfter = patch.balanceAfter;
    else if (walletTxn.balanceAfter !== undefined) pendingTxn.balanceAfter = walletTxn.balanceAfter;

    await pendingTxn.save();
    return pendingTxn;
  } catch {
    return walletTxn || null;
  }
}

// helper: mark pending txn -> failed
async function markPendingTxnFailed(pr, patch = {}) {
  try {
    const txn = await findPendingTxnForPR(pr);
    if (!txn) return null;

    txn.status = patch.status || "failed";
    if (patch.reason) txn.reason = patch.reason;
    if (patch.meta) txn.meta = { ...(txn.meta || {}), ...(patch.meta || {}) };
    if (patch.balanceAfter !== undefined) txn.balanceAfter = patch.balanceAfter;

    await txn.save();
    return txn;
  } catch {
    return null;
  }
}

// shared approve handler
async function approveHandler(req, res) {
  try {
    const { adminNote = "", adminTxnId = "" } = req.body || {};

    const pr = await PaymentRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: "Request not found" });
    if (pr.status !== "pending") return res.status(400).json({ message: "Already processed" });

    const userId = pr.user;
    const amt = Number(pr.amount || 0);

    if (!Number.isFinite(amt) || amt <= 0) {
      pr.status = "rejected";
      pr.adminNote = "Invalid amount";
      pr.rejectedAt = new Date();
      await pr.save();

      await markPendingTxnFailed(pr, {
        status: "failed",
        reason: "payment_invalid_amount",
        meta: { adminNote: "Invalid amount" },
      });

      return res.status(400).json({ message: "Invalid amount" });
    }

    // ✅ find pending txn BEFORE wallet txn (for merge)
    const pendingTxn = await findPendingTxnForPR(pr);

    let walletAfter = null;
    let walletTxn = null;

    if (pr.type === "add") {
      const credit = await applyWalletTxn({
        userId,
        type: "credit",
        reason: "payment_add_approved",
        amount: amt,
        refType: "PaymentRequest",
        refId: pr._id,
        meta: { adminNote },
      });

      walletAfter = credit?.wallet ?? null;
      walletTxn = credit?.txn ?? null;

      await promotePendingTxnOrKeepWalletTxn({
        pendingTxn,
        walletTxn,
        patch: {
          status: "success",
          reason: "payment_add_approved",
          balanceAfter: walletAfter,
          meta: { adminNote },
        },
      });
    } else if (pr.type === "withdraw") {
      try {
        const debit = await applyWalletTxn({
          userId,
          type: "debit",
          reason: "payment_withdraw_approved",
          amount: amt,
          refType: "PaymentRequest",
          refId: pr._id,
          meta: { adminNote },
        });

        walletAfter = debit?.wallet ?? null;
        walletTxn = debit?.txn ?? null;

        await promotePendingTxnOrKeepWalletTxn({
          pendingTxn,
          walletTxn,
          patch: {
            status: "success",
            reason: "payment_withdraw_approved",
            balanceAfter: walletAfter,
            meta: { adminNote },
          },
        });
      } catch (e) {
        pr.status = "rejected";
        pr.adminNote = "Insufficient wallet balance";
        pr.rejectedAt = new Date();
        await pr.save();

        await markPendingTxnFailed(pr, {
          status: "failed",
          reason: "payment_withdraw_rejected",
          meta: { adminNote: "Insufficient wallet balance" },
        });

        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
    } else {
      return res.status(400).json({ message: "Invalid request type" });
    }

    pr.status = "approved";
    pr.adminNote = adminNote;
    pr.adminTxnId = String(adminTxnId || "").trim();
    pr.approvedAt = new Date();
    await pr.save();

    const populated = await PaymentRequest.findById(pr._id)
      .populate("user", "username phone wallet role")
      .lean();

    return res.json({
      success: true,
      ok: true,
      request: populated,
      userWallet: populated?.user?.wallet,
      walletAfter,
    });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
}

// shared reject handler
async function rejectHandler(req, res) {
  try {
    const { adminNote = "" } = req.body || {};

    const pr = await PaymentRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: "Request not found" });
    if (pr.status !== "pending") return res.status(400).json({ message: "Already processed" });

    pr.status = "rejected";
    pr.adminNote = adminNote || "Rejected";
    pr.rejectedAt = new Date();
    await pr.save();

    await markPendingTxnFailed(pr, {
      status: "failed",
      reason: "payment_rejected",
      meta: { adminNote: pr.adminNote },
    });

    const populated = await PaymentRequest.findById(pr._id)
      .populate("user", "username phone wallet role")
      .lean();

    return res.json({ success: true, ok: true, request: populated });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
}

router.post("/payment-requests/:id/approve", adminAuth, approveHandler);
router.patch("/payment-requests/:id/approve", adminAuth, approveHandler);

router.post("/payment-requests/:id/reject", adminAuth, rejectHandler);
router.patch("/payment-requests/:id/reject", adminAuth, rejectHandler);

/**
 * Mark Paid (optional status)
 * - does NOT change wallet (wallet already updated on approve)
 */
router.post("/payment-requests/:id/mark-paid", adminAuth, async (req, res) => {
  try {
    const { adminTxnId = "" } = req.body || {};
    const pr = await PaymentRequest.findById(req.params.id);
    if (!pr) return res.status(404).json({ message: "Request not found" });

    if (pr.status !== "approved") {
      return res.status(400).json({ message: "Only approved requests can be marked paid" });
    }

    pr.status = "paid";
    pr.paidAt = new Date();
    if (adminTxnId) pr.adminTxnId = String(adminTxnId).trim();
    pr.adminNote = pr.adminNote ? `${pr.adminNote} | Paid` : "Paid";
    await pr.save();

    const populated = await PaymentRequest.findById(pr._id)
      .populate("user", "username phone wallet role")
      .lean();

    return res.json({ success: true, ok: true, request: populated });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

router.delete("/payment-requests/:id", adminAuth, async (req, res) => {
  try {
    await PaymentRequest.findByIdAndDelete(req.params.id);
    await Transaction.deleteMany({ refType: "PaymentRequest", refId: req.params.id }).catch(() => {});
    return res.json({ success: true, ok: true });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

module.exports = router;
