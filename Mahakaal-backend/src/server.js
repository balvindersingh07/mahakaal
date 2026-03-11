// src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// ---------------- Routes ----------------
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const gamesRoutes = require("./routes/games.routes");

// Wallet (user)
const walletRoutes = require("./routes/wallet.routes");

// ✅ Payment requests
const paymentRequestRoutes = require("./routes/paymentRequest.routes"); // USER (/api)
const adminPaymentReqRoutes = require("./routes/admin.paymentRequest.routes"); // ADMIN (/api/admin)

// Transactions + Ledger
const transactionsRoutes = require("./routes/transactions.routes");
const adminLedgerRoutes = require("./routes/admin.ledger.routes");

// Bets
const betsRoutes = require("./routes/bets.routes");
const adminBetsRoutes = require("./routes/admin.bets.routes");

// Results
const resultsRoutes = require("./routes/results.routes");
const adminResultsRoutes = require("./routes/admin.results.routes");

// ✅ Scanner (QR)
const scannerRoutes = require("./routes/scanner.routes"); // USER (/api)
const adminScannerRoutes = require("./routes/admin.scanner.routes"); // ADMIN (/api/admin)

// ✅ Admin Wallet Ops
const adminWalletRoutes = require("./routes/admin.wallet.routes");

// ✅ Admin Reports (NEW) -> combined / bet-report / user summary
const adminReportsRoutes = require("./routes/admin.reports.routes");

// ✅ Admin Referral / Commission config
const adminReferralRoutes = require("./routes/admin.referral.routes");

// ✅ COMMISSION
const commissionRoutes = require("./routes/commission.routes");

// ✅ WINNINGS
const winningsRoutes = require("./routes/winnings.routes");

// ✅ Deposit (user UPI deposit requests)
const depositRoutes = require("./routes/deposit.routes");
const adminDepositRoutes = require("./routes/admin.deposit.routes");

// ✅ Upload (admin + user image upload)
const uploadRoutes = require("./routes/upload.routes");
const path = require("path");

const app = express();

/* ---------------- Proxy (important for Render/Nginx/VPS) ---------------- */
app.set("trust proxy", 1);

/* ---------------- CORS (production-safe) ----------------
 * Set env:
 *   ALLOWED_ORIGINS=https://admin.example.com,https://app.example.com
 * If not set → allow all (dev friendly), same as old behavior.
 */
function parseOrigins(v) {
  return String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
const ALLOWED_ORIGINS = parseOrigins(process.env.ALLOWED_ORIGINS);

const corsOptions = {
  origin: (origin, cb) => {
    // Allow non-browser calls (RN/mobile, curl, Postman) where origin is undefined/null
    if (!origin) return cb(null, true);

    // Dev mode: if no whitelist provided, allow all (matches previous behavior)
    if (!ALLOWED_ORIGINS.length) return cb(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// ✅ FIX: "*" crashes in your router/path-to-regexp stack; use regex to match all
app.options(/.*/, cors(corsOptions));

/* ---------------- Body limits ---------------- */
const JSON_LIMIT = process.env.JSON_LIMIT || "2mb";
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ extended: true }));

/* ---------------- Health ---------------- */
app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    mounts: {
      auth: ["/auth", "/api/auth"],
      games: ["/api (gamesRoutes)"],
      user: ["/api (userRoutes)"],
      wallet: ["/api (walletRoutes)"],
      bets: ["/api (betsRoutes)"],
      results: ["/api (resultsRoutes)"],
      commission: ["/api (commissionRoutes)"],
      winnings: ["/api (winningsRoutes)"],
      scanner: ["/api (scannerRoutes)"],
      payments_user: ["/api (paymentRequestRoutes)"],
      transactions: ["/api (transactionsRoutes)"],

      admin: ["/api/admin (adminRoutes)"],
      admin_wallet: ["/api/admin (adminWalletRoutes)"],
      admin_payments: ["/api/admin (adminPaymentReqRoutes)"],
      admin_ledger: ["/api/admin (adminLedgerRoutes)"],
      admin_bets: ["/api/admin (adminBetsRoutes)"],
      admin_results: ["/api/admin (adminResultsRoutes)"],
      admin_scanner: ["/api/admin (adminScannerRoutes)"],
      admin_reports: ["/api/admin (adminReportsRoutes)"],
      admin_referral: ["/api/admin (adminReferralRoutes)"],
    },
  })
);

/* ---------------- ROUTE MOUNTS ---------------- */

// Auth: support both
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Games (public)
app.use("/api", gamesRoutes);

// User core
app.use("/api", userRoutes);

// Wallet (user)
app.use("/api", walletRoutes);

// ✅ Payment requests (USER)
app.use("/api", paymentRequestRoutes);

// Transactions (user statement)
app.use("/api", transactionsRoutes);

// Bets (user)
app.use("/api", betsRoutes);

// Results (user)
app.use("/api", resultsRoutes);

// Commission (user)
app.use("/api", commissionRoutes);

// Winnings (user)
app.use("/api", winningsRoutes);

// Scanner (user)
app.use("/api", scannerRoutes);

// Deposit (user)
app.use("/api", depositRoutes);

// Admin Deposits
app.use("/api/admin", adminDepositRoutes);

// Upload (admin + user)
app.use("/api", uploadRoutes);

// Static uploads (files saved to ./uploads)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ---------------- ADMIN MOUNTS ---------------- */

// Admin login / admin helper routes
app.use("/api/admin", adminRoutes);

// ✅ Admin Wallet Ops (add/withdraw)
app.use("/api/admin", adminWalletRoutes);

// Admin Payment Requests
app.use("/api/admin", adminPaymentReqRoutes);

// Admin Ledger
app.use("/api/admin", adminLedgerRoutes);

// Admin Bets
app.use("/api/admin", adminBetsRoutes);

// Admin Results
app.use("/api/admin", adminResultsRoutes);

// ✅ Admin Reports (combined / bet-report / user summary)
app.use("/api/admin", adminReportsRoutes);

// ✅ Admin Referral / Commission config
app.use("/api/admin", adminReferralRoutes);

// Scanner (admin)
app.use("/api/admin", adminScannerRoutes);

/* ---------------- Root ---------------- */
app.get("/", (req, res) => res.send("Mahakaal Backend Running ✅"));

/* ---------------- 404 ---------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/* ---------------- Error Handler (central) ---------------- */
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  console.error("❌ API Error:", {
    status,
    path: req.originalUrl,
    method: req.method,
    message: err.message,
  });

  res.status(status).json({
    success: false,
    message: status === 500 ? "Server error" : err.message,
  });
});

/* ---------------- Start ---------------- */
const PORT = process.env.PORT || 8000;

async function start() {
  try {
    await connectDB();
    const server = app.listen(PORT, () =>
      console.log(`✅ Server running on http://localhost:${PORT}`)
    );

    const shutdown = (signal) => {
      console.log(`🛑 ${signal} received. Shutting down...`);
      server.close(() => {
        console.log("✅ Server closed.");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (e) {
    console.error("❌ Failed to start server:", e?.message || e);
    process.exit(1);
  }
}

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err?.message || err);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err?.message || err);
  process.exit(1);
});

start();
