// src/services/wallet.service.js
const mongoose = require("mongoose");
const User = require("../models/User");
const Transaction = require("../models/Transaction");

function isTxnUnsupportedError(e) {
  const msg = String(e?.message || e || "");
  const name = String(e?.name || "");
  const code = e?.code;

  if (
    msg.includes("Transaction numbers are only allowed") ||
    msg.includes("replica set") ||
    msg.includes("mongos") ||
    msg.includes("startTransaction") ||
    msg.includes("IllegalOperation") ||
    msg.toLowerCase().includes("not supported") ||
    msg.includes("NoSuchTransaction")
  ) return true;

  if (name === "MongoServerError" && (code === 20 || code === 251)) return true;
  return false;
}

function isDuplicateKeyError(e) {
  return e && (e.code === 11000 || String(e?.message || "").includes("E11000"));
}

/** Fetch latest wallet best-effort */
async function getWallet(userId) {
  const u = await User.findById(userId).lean().catch(() => null);
  const w = Number(u?.wallet ?? u?.balance ?? u?.walletBalance ?? 0) || 0;
  return { user: u, wallet: w };
}

/**
 * Find an existing txn for same ref.
 * - Prefer SUCCESS (idempotency key)
 * - Else fallback to latest PENDING (lock row)
 */
async function findTxnByRef({ userId, type, reason, refType, refId }) {
  if (!refType || !refId) return null;

  // 1) SUCCESS txn => idempotency true (already applied)
  const success = await Transaction.findOne({
    user: userId,
    type,
    reason,
    refType: String(refType),
    refId,
    status: "success",
  })
    .sort({ createdAt: -1 })
    .lean()
    .catch(() => null);

  if (success) return success;

  // 2) pending lock txn (created earlier by paymentRequest routes)
  const pending = await Transaction.findOne({
    refType: String(refType),
    refId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean()
    .catch(() => null);

  return pending || null;
}

/**
 * applyWalletTxn
 * - ✅ Idempotent when refType+refId provided (based on SUCCESS txn)
 * - ✅ Uses Mongo transaction if supported
 * - ✅ Fallback uses atomic wallet update + (optional) promote pending txn to success
 */
async function applyWalletTxn(payload = {}) {
  const {
    userId,
    type = "debit",
    amount = 0,
    reason = "",
    refType = "",
    refId = null,
    meta = {},
  } = payload;

  const amt = Number(amount || 0);
  if (!userId) throw new Error("userId required");
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Invalid amount");
  if (type !== "credit" && type !== "debit") throw new Error("Invalid txn type");

  const hasRef = !!(refType && refId);

  // ----------------------------
  // 0) FAST IDENTITY CHECK (works in all modes)
  // if success already exists => return without touching wallet
  // ----------------------------
  if (hasRef) {
    const existingSuccess = await Transaction.findOne({
      user: userId,
      type,
      reason,
      refType: String(refType),
      refId,
      status: "success",
    })
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => null);

    if (existingSuccess) {
      const snap = await getWallet(userId);
      return { wallet: snap.wallet, txn: existingSuccess, user: snap.user };
    }
  }

  // ----------------------------
  // 1) TRY TRANSACTION MODE (Atlas replica set)
  // ----------------------------
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // ✅ Idempotency inside txn: SUCCESS only
    if (hasRef) {
      const existing = await Transaction.findOne({
        user: userId,
        type,
        reason,
        refType: String(refType),
        refId,
        status: "success",
      }).session(session);

      if (existing) {
        const snap = await getWallet(userId);
        await session.commitTransaction();
        session.endSession();
        return {
          wallet: snap.wallet,
          txn: existing.toObject ? existing.toObject() : existing,
          user: snap.user,
        };
      }
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const current = Number(user.wallet ?? user.balance ?? user.walletBalance ?? 0) || 0;

    let next = current;
    if (type === "debit") {
      if (current < amt) throw new Error("Insufficient wallet balance");
      next = current - amt;
    } else {
      next = current + amt;
    }

    user.wallet = next;
    if (user.balance != null) user.balance = next;
    if (user.walletBalance != null) user.walletBalance = next;
    await user.save({ session });

    const txnDoc = {
      user: user._id,
      type,
      amount: amt,
      reason,
      status: "success",
      refType,
      refId,
      meta,
      balanceAfter: next,
    };

    let txn = null;
    try {
      const created = await Transaction.create([txnDoc], { session });
      txn = created?.[0] || null;
    } catch (e) {
      // ✅ if duplicate success (rare race) => fetch and return
      if (isDuplicateKeyError(e) && hasRef) {
        const existing = await Transaction.findOne({
          user: userId,
          type,
          reason,
          refType: String(refType),
          refId,
          status: "success",
        }).session(session);
        txn = existing || null;
      } else {
        throw e;
      }
    }

    await session.commitTransaction();
    session.endSession();
    return { wallet: next, txn, user };
  } catch (e) {
    try {
      if (session) {
        await session.abortTransaction().catch(() => {});
        session.endSession();
      }
    } catch {}

    if (!isTxnUnsupportedError(e)) throw e;
    // else fallback below
  }

  // ----------------------------
  // 2) FALLBACK MODE (NO Mongo transactions)
  // ----------------------------

  // If there is already a pending txn for same ref (created by paymentRequest),
  // reuse it so we don't create multiple pending rows.
  let pendingTxn = null;
  if (hasRef) {
    pendingTxn = await Transaction.findOne({
      refType: String(refType),
      refId,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .catch(() => null);
  }

  // Now do atomic wallet update
  let user = null;

  if (type === "debit") {
    user = await User.findOneAndUpdate(
      { _id: userId, wallet: { $gte: amt } },
      { $inc: { wallet: -amt } },
      { new: true }
    );

    if (!user) {
      // mark pending as failed (best effort)
      if (pendingTxn?._id) {
        await Transaction.updateOne(
          { _id: pendingTxn._id },
          { $set: { status: "failed", reason: reason || "wallet_debit_failed" } }
        ).catch(() => {});
      }

      const exists = await User.exists({ _id: userId });
      if (!exists) throw new Error("User not found");
      throw new Error("Insufficient wallet balance");
    }
  } else {
    user = await User.findByIdAndUpdate(userId, { $inc: { wallet: +amt } }, { new: true });
    if (!user) {
      if (pendingTxn?._id) {
        await Transaction.updateOne(
          { _id: pendingTxn._id },
          { $set: { status: "failed", reason: reason || "wallet_credit_failed" } }
        ).catch(() => {});
      }
      throw new Error("User not found");
    }
  }

  const next = Number(user.wallet ?? 0) || 0;

  // Best-effort sync extra fields if exist
  try {
    const patch = {};
    if (user.balance != null) patch.balance = next;
    if (user.walletBalance != null) patch.walletBalance = next;
    if (Object.keys(patch).length) {
      await User.updateOne({ _id: user._id }, { $set: patch }).catch(() => {});
    }
  } catch {}

  // ✅ If pending txn exists, promote it to SUCCESS (single statement row)
  if (pendingTxn?._id) {
    await Transaction.updateOne(
      { _id: pendingTxn._id },
      {
        $set: {
          status: "success",
          reason: reason || pendingTxn.reason,
          balanceAfter: next,
          meta: { ...(pendingTxn.meta || {}), ...(meta || {}) },
        },
      }
    ).catch(() => {});

    const fresh = await Transaction.findById(pendingTxn._id).lean().catch(() => pendingTxn);
    return { wallet: next, txn: fresh, user };
  }

  // ✅ No pending row existed => create SUCCESS txn
  let txn = null;
  try {
    txn = await Transaction.create({
      user: user._id,
      type,
      amount: amt,
      reason,
      status: "success",
      refType,
      refId,
      meta,
      balanceAfter: next,
    });
  } catch (e) {
    // if duplicate key for success, fetch and return (idempotency)
    if (isDuplicateKeyError(e) && hasRef) {
      const existing = await Transaction.findOne({
        user: userId,
        type,
        reason,
        refType: String(refType),
        refId,
        status: "success",
      })
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => null);

      return { wallet: next, txn: existing, user };
    }
    throw e;
  }

  return { wallet: next, txn, user };
}

module.exports = { applyWalletTxn };
