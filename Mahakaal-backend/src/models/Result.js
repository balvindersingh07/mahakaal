// src/models/Result.js
const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, index: true },
    gameName: { type: String, default: "" },

    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
    type: { type: String, default: "main", index: true },   // main/open/close etc

    result: { type: String, required: true }, // "00".."99"

    declaredBy: { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ One result per game+date+type
ResultSchema.index({ gameId: 1, dateKey: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Result", ResultSchema);
