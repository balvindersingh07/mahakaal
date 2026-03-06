// src/routes/results.routes.js
const router = require("express").Router();
const Result = require("../models/Result");

// IST helpers
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

function cleanStr(v) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

function buildGameFilter(gameId, gameName) {
  const gid = cleanStr(gameId);
  const gname = cleanStr(gameName);

  if (gid && gname) return { $or: [{ gameId: gid }, { gameName: gname }] };
  if (gid) return { gameId: gid };
  if (gname) return { gameName: gname };
  return {};
}

// GET /api/results?gameId=&gameName=&dateKey=&from=&to=&type=&limit=
router.get("/results", async (req, res) => {
  try {
    const { gameId, gameName, dateKey, type, from, to } = req.query || {};

    const limitRaw = Number(req.query?.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

    const q = {
      ...buildGameFilter(gameId, gameName),
    };

    // single dateKey takes priority
    const dk = cleanStr(dateKey);
    if (dk) {
      q.dateKey = dk;
    } else {
      // date range: from=YYYY-MM-DD to=YYYY-MM-DD
      const fromKey = cleanStr(from);
      const toKey = cleanStr(to);
      if (fromKey && toKey) {
        q.dateKey = { $gte: fromKey, $lte: toKey };
      } else if (fromKey) {
        q.dateKey = { $gte: fromKey };
      } else if (toKey) {
        q.dateKey = { $lte: toKey };
      }
    }

    const t = cleanStr(type);
    if (t) q.type = t;

    const rows = await Result.find(q)
      .sort({ dateKey: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    // normalize each row so frontend can reliably read fields
    const normalized = rows.map((r) => ({
      _id: r._id,
      date: r.dateKey || "",
      dateKey: r.dateKey || "",
      gameId: r.gameId || "",
      gameName: r.gameName || r.gameId || "",
      result: r.result ?? r.value ?? "",
      type: r.type || "main",
      declaredAt: r.declaredAt || r.createdAt,
    }));

    return res.json({ success: true, data: normalized, rows: normalized, results: normalized });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Results fetch failed",
    });
  }
});

// GET /api/results/today?gameId=&gameName=&type=&limit=
router.get("/results/today", async (req, res) => {
  try {
    const { gameId, gameName, type } = req.query || {};

    const limitRaw = Number(req.query?.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

    const q = {
      dateKey: dateKeyIST(),
      ...buildGameFilter(gameId, gameName),
    };

    const t = cleanStr(type);
    if (t) q.type = t;
    // If your app always expects only main today results by default, uncomment:
    // else q.type = "main";

    const rows = await Result.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const normalized = rows.map((r) => ({
      _id: r._id,
      date: r.dateKey || "",
      dateKey: r.dateKey || "",
      gameId: r.gameId || "",
      gameName: r.gameName || r.gameId || "",
      result: r.result ?? r.value ?? "",
      type: r.type || "main",
      declaredAt: r.declaredAt || r.createdAt,
    }));

    return res.json({ success: true, data: normalized, rows: normalized, results: normalized });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Today results fetch failed",
    });
  }
});

module.exports = router;
