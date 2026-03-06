const mongoose = require("mongoose");

const scannerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Public image URL (e.g. Cloudinary/S3) or local path served by static files
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    upiId: {
      type: String,
      trim: true,
    },

    note: {
      type: String,
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// A user should normally have at most one active scanner
scannerSchema.index({ user: 1, active: 1 });

module.exports = mongoose.model("Scanner", scannerSchema);

