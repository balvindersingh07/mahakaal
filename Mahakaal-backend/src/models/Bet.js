// src/models/Bet.js
const mongoose = require("mongoose");

const BetItemSchema = new mongoose.Schema(
  {
    type: { type: String, default: "num" }, // num | andar | bahar | crossing | no-to-no
    key: { type: String, default: "" },     // "07", "5", etc
    num: { type: String, default: "" },     // for crossing support
    amount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const BetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // game stable id (slug / name) used across bets/results
    gameId: { type: String, default: "", trim: true, index: true },
    gameName: { type: String, default: "", trim: true },

    // keep for compatibility, but logic uses items[].type
    betType: { type: String, default: "num" },

    items: { type: [BetItemSchema], default: [] },

    total: { type: Number, required: true, min: 1 },

    status: {
      type: String,
      // ✅ keep initiated for old code safety
      enum: ["initiated", "pending", "won", "lost", "refunded"],
      default: "pending",
      index: true,
    },

    // result settlement
    resultValue: { type: String, default: "", index: true }, // "00".."99"
    winAmount: { type: Number, default: 0 },

    // wallet transaction links
    debitTxnId: { type: mongoose.Schema.Types.ObjectId, default: null },
    winTxnId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // IST date for today filter
    dateKey: { type: String, default: "", index: true }, // YYYY-MM-DD

    // idempotency / duplicate protection fingerprint
    requestHash: { type: String, default: "", trim: true, index: true },
  },
  { timestamps: true }
);

// 🔥 PERFORMANCE INDEXES
BetSchema.index({ gameId: 1, dateKey: 1, status: 1 });
BetSchema.index({ user: 1, createdAt: -1 });

// ✅ helps fast duplicate detection (keep)
BetSchema.index({ user: 1, requestHash: 1, createdAt: -1 });

module.exports = mongoose.model("Bet", BetSchema);
