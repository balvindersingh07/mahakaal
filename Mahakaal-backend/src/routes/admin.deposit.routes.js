// routes/admin.deposit.routes.js
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const Deposit = require("../models/Deposit");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { applyWalletTxn } = require("../services/wallet.service");

/**
 * GET /api/admin/deposits?status=pending
 */
router.get("/deposits", adminAuth, async (req, res) => {
  try {
    const { status } = req.query || {};
    const q = {};
    if (status) q.status = String(status).toLowerCase();

    const list = await Deposit.find(q)
      .populate("user", "username phone wallet")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, deposits: list, items: list });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to load deposits",
    });
  }
});

/**
 * POST /api/admin/deposits/:id/approve
 * - Add amount to user wallet
 * - Update deposit status to approved
 */
router.post("/deposits/:id/approve", adminAuth, async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate("user").lean();
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }
    if (deposit.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Deposit already ${deposit.status}`,
      });
    }

    const userId = deposit.user?._id || deposit.user;
    const amount = Number(deposit.amount) || 0;
    if (!userId || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid deposit data" });
    }

    await applyWalletTxn({
      userId,
      type: "credit",
      amount,
      reason: "deposit_approved",
      refType: "Deposit",
      refId: deposit._id,
      meta: { source: "upi_deposit", screenshotUrl: deposit.screenshotUrl },
    });

    await Deposit.updateOne(
      { _id: deposit._id },
      {
        $set: {
          status: "approved",
          reviewedBy: req.adminId || req.admin?.id || req.admin?._id,
          reviewedAt: new Date(),
        },
      }
    );

    const updated = await Deposit.findById(deposit._id)
      .populate("user", "username phone wallet")
      .lean();

    return res.json({ success: true, deposit: updated, message: "Deposit approved. Wallet credited." });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to approve deposit",
    });
  }
});

/**
 * POST /api/admin/deposits/:id/reject
 */
router.post("/deposits/:id/reject", adminAuth, async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id).lean();
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }
    if (deposit.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Deposit already ${deposit.status}`,
      });
    }

    await Deposit.updateOne(
      { _id: deposit._id },
      {
        $set: {
          status: "rejected",
          reviewedBy: req.adminId || req.admin?.id || req.admin?._id,
          reviewedAt: new Date(),
        },
      }
    );

    const updated = await Deposit.findById(deposit._id)
      .populate("user", "username phone")
      .lean();

    return res.json({ success: true, deposit: updated, message: "Deposit rejected" });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to reject deposit",
    });
  }
});

module.exports = router;
