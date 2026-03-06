// models/Commission.js
const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // earner
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who placed bet
    bet: { type: mongoose.Schema.Types.ObjectId, ref: "Bet" },

    amount: { type: Number, required: true },
    rate: { type: Number, default: 0.02 }, // 2% default
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Commission", commissionSchema);
