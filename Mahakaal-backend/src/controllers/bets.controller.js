// src/controllers/bets.controller.js
const crypto = require("crypto");
const Bet = require("../models/Bet");
const Commission = require("../models/Commission");
const Game = require("../models/Game");
const { applyWalletTxn } = require("../services/wallet.service");

/* ================= CONFIG ================= */

const MAX_STAKE_PER_BET = 100000;
const IDEMPOTENCY_WINDOW_SEC = 30;
const ALLOWED_BET_TYPES = ["num", "no-to-no", "crossing", "andar", "bahar", "jantri"];

/* ================= IST HELPERS ================= */

const istNow = () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 330 * 60000);
};

const dateKeyIST = () => {
  const d = istNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

/* ================= HELPERS ================= */

const toMin = (t) => {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const isOpenNow = (openTime, closeTime) => {
  const o = toMin(openTime);
  const c = toMin(closeTime);
  if (o == null || c == null) return true;
  const now = istNow();
  const n = now.getHours() * 60 + now.getMinutes();
  return c > o ? n >= o && n < c : n >= o || n < c;
};

const normType = (t) => {
  const s = String(t || "").toLowerCase().trim();
  if (!s || s === "jantri") return "num";
  if (["no_to_no", "notono", "no2no"].includes(s)) return "no-to-no";
  return s;
};

function makeSlug(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function normalizeItems(itemsRaw) {
  const arr = (Array.isArray(itemsRaw) ? itemsRaw : [])
    .map((it) => {
      if (!it) return null;
      const amount = Number(it.amount ?? it.amt ?? it.value ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return null;

      const num = it.num != null ? String(it.num) : "";
      const key = it.key != null ? String(it.key) : num;
      if (!key) return null;

      return {
        type: normType(it.type || it.betType || "num"),
        key: String(key).trim(),
        num: String(num).trim(),
        amount,
      };
    })
    .filter(Boolean);

  arr.sort((a, b) =>
    `${a.type}|${a.key}|${a.num}|${a.amount}`.localeCompare(
      `${b.type}|${b.key}|${b.num}|${b.amount}`
    )
  );

  return arr;
}

function makeRequestHash({ userId, gameId, dateKey, betType, items, stake }) {
  const payload = {
    userId: String(userId),
    gameId: String(gameId),
    dateKey,
    betType,
    stake,
    items,
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/* ================= PLACE BET ================= */

exports.placeBet = async (req, res) => {
  let bet = null;
  let debit = null;

  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = req.user;
    const body = req.body || {};
    const items = normalizeItems(body.items);
    const stake = items.reduce((a, x) => a + x.amount, 0);

    if (!items.length || stake <= 0) {
      return res.status(400).json({ success: false, message: "Invalid bet" });
    }

    if (stake > MAX_STAKE_PER_BET) {
      return res.status(400).json({ success: false, message: "Stake limit exceeded" });
    }

    let game = null;
    const rawGameId = String(body.gameId || "").trim();
    const rawGameName = String(body.gameName || "").trim();

    if (rawGameId && /^[0-9a-fA-F]{24}$/.test(rawGameId)) {
      game = await Game.findById(rawGameId).lean();
    }

    if (!game && rawGameId) {
      game =
        (await Game.findOne({ slug: rawGameId }).lean().catch(() => null)) ||
        (await Game.findOne({ name: rawGameId }).lean().catch(() => null));
    }

    if (!game && rawGameName) {
      game = await Game.findOne({ name: rawGameName }).lean();
    }

    if (!game) {
      return res.status(400).json({ success: false, message: "Game not found" });
    }

    if (game.active === false) {
      return res.status(400).json({ success: false, message: "Game inactive" });
    }

    if (!isOpenNow(game.openTime, game.closeTime)) {
      return res.status(400).json({ success: false, message: "Game closed" });
    }

    const betType = normType(body.betType || body.type || "num");

    if (!ALLOWED_BET_TYPES.includes(betType)) {
      return res.status(400).json({ success: false, message: "Invalid bet type" });
    }

    const dk = dateKeyIST();

    const requestHash = makeRequestHash({
      userId: user._id,
      gameId: game.slug || makeSlug(game.name),
      dateKey: dk,
      betType,
      items,
      stake,
    });

    const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_SEC * 1000);

    const existing = await Bet.findOne({
      user: user._id,
      requestHash,
      createdAt: { $gte: since },
    }).lean();

    if (existing) {
      return res.json({ success: true, duplicate: true, bet: existing });
    }

    bet = await Bet.create({
      user: user._id,
      gameId: game.slug || makeSlug(game.name),
      gameName: game.name,
      betType,
      items,
      total: stake,
      status: "pending",
      dateKey: dk,
      requestHash,
    });

    debit = await applyWalletTxn({
      userId: user._id,
      type: "debit",
      amount: stake,
      reason: "bet_place",
      refType: "Bet",
      refId: bet._id,
    });

    await Bet.updateOne({ _id: bet._id }, { debitTxnId: debit?.txn?._id });

    const { sendToAdmin } = require("../services/adminPush.service");
    sendToAdmin("🎲 New Bet Placed", `₹${stake} on ${game.slug || game.name}`).catch(() => {});

    return res.json({
      success: true,
      bet,
      wallet: debit?.wallet || null,
    });
  } catch (err) {
    console.error("placeBet error:", err);

    if (bet && !debit) {
      await Bet.deleteOne({ _id: bet._id }).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: "Bet failed",
    });
  }
};

/* ================= MY BETS ================= */

exports.myBets = async (req, res) => {
  try {
    const rows = await Bet.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, rows });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Fetch failed",
    });
  }
};

/* ================= TODAY BETS ================= */

exports.todayBets = async (req, res) => {
  try {
    const dk = dateKeyIST();

    const rows = await Bet.find({
      user: req.user._id,
      dateKey: dk,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, rows });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Today fetch failed",
    });
  }
};