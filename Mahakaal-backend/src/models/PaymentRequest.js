// src/models/PaymentRequest.js
const mongoose = require("mongoose");

const paymentRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // add | withdraw
    type: {
      type: String,
      enum: ["add", "withdraw"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      // ✅ safe: if frontend sends "100" as string, it becomes 100
      set: (v) => Number(v),
    },

    // whatsapp / upi / cash etc (info only)
    mode: { type: String, default: "whatsapp" },

    // optional note like "UPI: name@bank"
    note: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
      index: true,
    },

    // admin actions
    adminNote: { type: String, default: "" },
    adminTxnId: { type: String, default: "" }, // UPI/transaction ID when admin pays
    approvedAt: { type: Date },
    rejectedAt: { type: Date },

    // ✅ ADD (fix for mark-paid)
    paidAt: { type: Date, index: true },
  },
  { timestamps: true }
);

// ✅ helpful indexes for admin/user dashboards
paymentRequestSchema.index({ createdAt: -1 });
paymentRequestSchema.index({ user: 1, createdAt: -1 });
paymentRequestSchema.index({ status: 1, createdAt: -1 });

// ✅ common admin query: status + createdAt
paymentRequestSchema.index({ status: 1, createdAt: -1 });

// ✅ paid listing fast (optional)
paymentRequestSchema.index({ status: 1, paidAt: -1 });

module.exports = mongoose.model("PaymentRequest", paymentRequestSchema);
