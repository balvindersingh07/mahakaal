// src/models/Game.js
const mongoose = require("mongoose");

function isHHmm(v) {
  const s = String(v || "").trim();
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function toSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 60,
    },

    // ✅ stable identifier used by APIs
    slug: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    // "HH:mm"
    openTime: {
      type: String,
      default: "07:00",
      trim: true,
      validate: {
        validator: isHHmm,
        message: "openTime must be valid HH:mm (00:00 to 23:59)",
      },
    },

    closeTime: {
      type: String,
      default: "23:00",
      trim: true,
      validate: {
        validator: isHHmm,
        message: "closeTime must be valid HH:mm (00:00 to 23:59)",
      },
    },

    active: { type: Boolean, default: true },
    order: { type: Number, default: 0, min: 0 },

    /**
     * ✅ Payout rates (NON-BREAKING)
     * Used by admin.results.routes.js settlement:
     *  - rateNum, rateCrossing, rateNoToNo => 2-digit match payout (00-99)
     *  - rateAndar, rateBahar => single digit payout (0-9)
     */
    rateNum: { type: Number, default: 90, min: 1 },
    rateCrossing: { type: Number, default: 90, min: 1 },
    rateNoToNo: { type: Number, default: 90, min: 1 },
    rateAndar: { type: Number, default: 9, min: 1 },
    rateBahar: { type: Number, default: 9, min: 1 },
  },
  { timestamps: true }
);

// ✅ Auto-generate slug from name (non-breaking)
gameSchema.pre("save", function (next) {
  // if name updated or slug missing, ensure slug
  if (!this.slug || this.isModified("name")) this.slug = toSlug(this.name);
  next();
});

// helpful indexes
gameSchema.index({ active: 1, order: 1, createdAt: 1 });
gameSchema.index({ slug: 1 }, { unique: false });

module.exports = mongoose.model("Game", gameSchema);
