// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },

    password: { type: String, required: true }, // bcrypt hash

    wallet: { type: Number, default: 0, min: 0 }, // ✅ single source of truth (never negative)

    // 🔥 REFERRAL SYSTEM
    referralCode: { type: String, unique: true, index: true, trim: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    role: { type: String, default: "user", enum: ["user", "admin"] },
    status: { type: String, default: "active", enum: ["active", "blocked"] },
  },
  { timestamps: true }
);

// prevent duplicate phone
userSchema.index({ phone: 1 }, { unique: true });

// 🔥 referralCode generator (collision safe)
function generateReferralCode() {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MK${rand}`;
}

/**
 * ✅ IMPORTANT FIX:
 * Mongoose middleware: either use next-callback OR async/await promise.
 * We will use async/await (NO next), so "next is not a function" can never happen.
 */
userSchema.pre("save", async function () {
  // normalize
  if (this.phone) this.phone = String(this.phone).replace(/\D/g, "").slice(-10);
  if (this.username) this.username = String(this.username).trim();

  // if already present, nothing to do
  if (this.referralCode) return;

  // try few times to avoid rare collision
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const exists = await mongoose.models.User.findOne({ referralCode: code })
      .select("_id")
      .lean();

    if (!exists) {
      this.referralCode = code;
      break;
    }
  }

  // fallback (very rare)
  if (!this.referralCode) {
    this.referralCode = `MK${Date.now().toString().slice(-6)}`;
  }
});

module.exports = mongoose.model("User", userSchema);
