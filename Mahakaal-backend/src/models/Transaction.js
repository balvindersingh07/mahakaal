// src/models/Transaction.js
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },

    reason: { type: String, default: "", index: true },

    status: {
      type: String,
      enum: ["success", "pending", "failed"],
      default: "success",
      index: true,
    },

    refType: { type: String, default: "", index: true }, // "Bet", "PaymentRequest", etc
    refId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    meta: { type: Object, default: {} },
    balanceAfter: { type: Number, default: null },
  },
  { timestamps: true }
);

// 🔥 Performance indexes
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ user: 1, createdAt: -1 });

// ✅ Helps admin.paymentRequest merge: find pending txn fast
TransactionSchema.index({ refType: 1, refId: 1, status: 1, createdAt: -1 });

/**
 * ✅ SAFE Idempotency (DB level)
 * Only blocks DUPLICATE SUCCESS txns for same operation.
 *
 * Why "success" only?
 * - PaymentRequest flow creates a PENDING txn first (statement screen).
 * - On approve, wallet.service may create a SUCCESS txn.
 * - If we make unique across ALL statuses, approve can crash (duplicate key),
 *   and in fallback path wallet could update but txn insert fail.
 */
TransactionSchema.index(
  { user: 1, type: 1, reason: 1, refType: 1, refId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      refId: { $type: "objectId" },
      refType: { $ne: "" },
      status: "success",
    },
  }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
