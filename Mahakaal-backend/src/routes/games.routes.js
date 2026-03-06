// src/routes/games.routes.js
const router = require("express").Router();
const Game = require("../models/Game");
const adminAuth = require("../middleware/adminAuth");

/** make slug from name (fallback only) */
function makeSlug(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function numOrUndef(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** safe mapper (keeps compatibility fields) */
function mapGame(g) {
  const slug = String(g.slug || "").trim() || makeSlug(g.name);

  return {
    // original fields
    _id: g._id,
    name: g.name,
    openTime: g.openTime,
    closeTime: g.closeTime,
    active: !!g.active,
    order: Number(g.order || 0),
    createdAt: g.createdAt,

    // ✅ payout rates (safe to expose; frontend ignore if not used)
    rateNum: Number(g.rateNum ?? 90),
    rateCrossing: Number(g.rateCrossing ?? 90),
    rateNoToNo: Number(g.rateNoToNo ?? 90),
    rateAndar: Number(g.rateAndar ?? 9),
    rateBahar: Number(g.rateBahar ?? 9),

    // aliases (frontend compatibility)
    id: String(g._id),
    slug,
    gameId: slug, // stable id used by bets/results as "gameId"
    start: g.openTime,
    end: g.closeTime,
  };
}

/**
 * --------------------------------------------------
 * GET /api/games
 * Default: only active games (USER SAFE)
 *
 * If ?all=1:
 *  - If admin token valid => returns all games
 *  - Else => still returns only active games (NO BREAK)
 * --------------------------------------------------
 */
router.get("/games", async (req, res) => {
  try {
    const wantsAll = String(req.query.all || "") === "1";

    const fetchActive = async () => {
      const games = await Game.find({ active: true })
        .sort({ order: 1, createdAt: 1 })
        .lean();
      const mapped = games.map(mapGame);
      return res.json({
        success: true,
        data: mapped,
        games: mapped,
        rows: mapped,
        items: mapped,
        all: false,
      });
    };

    if (!wantsAll) return fetchActive();

    // wantsAll=1 => try adminAuth, but do NOT break user app if token missing/invalid
    let isAdmin = false;
    await new Promise((resolve) => {
      adminAuth(
        req,
        {
          ...res,
          status: () => ({ json: () => resolve() }),
          json: () => resolve(),
        },
        () => {
          isAdmin = true;
          resolve();
        }
      );
    });

    if (!isAdmin) return fetchActive();

    const games = await Game.find({}).sort({ order: 1, createdAt: 1 }).lean();
    const mapped = games.map(mapGame);

    return res.json({
      success: true,
      data: mapped,
      games: mapped,
      rows: mapped,
      items: mapped,
      all: true,
    });
  } catch (e) {
    console.error("GET games error:", e?.message || e);
    return res.status(500).json({
      success: false,
      message: "Failed to load games",
    });
  }
});

/**
 * --------------------------------------------------
 * ADMIN: UPDATE GAME
 * PUT /api/admin/games/:id
 *
 * ✅ Now also supports payout rates:
 *  - rateNum, rateCrossing, rateNoToNo, rateAndar, rateBahar
 * --------------------------------------------------
 */
router.put("/admin/games/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      openTime,
      closeTime,
      active,
      order,

      // ✅ payout rates
      rateNum,
      rateCrossing,
      rateNoToNo,
      rateAndar,
      rateBahar,
    } = req.body || {};

    const game = await Game.findById(id);
    if (!game) return res.status(404).json({ success: false, message: "Game not found" });

    if (name !== undefined) game.name = name;
    if (openTime !== undefined) game.openTime = openTime;
    if (closeTime !== undefined) game.closeTime = closeTime;
    if (active !== undefined) game.active = !!active;
    if (order !== undefined) game.order = Number(order) || 0;

    // ✅ rates (only if provided, else keep old)
    const rn = numOrUndef(rateNum);
    const rc = numOrUndef(rateCrossing);
    const rnn = numOrUndef(rateNoToNo);
    const ra = numOrUndef(rateAndar);
    const rb = numOrUndef(rateBahar);

    if (rn !== undefined) game.rateNum = rn;
    if (rc !== undefined) game.rateCrossing = rc;
    if (rnn !== undefined) game.rateNoToNo = rnn;
    if (ra !== undefined) game.rateAndar = ra;
    if (rb !== undefined) game.rateBahar = rb;

    await game.save();

    return res.json({
      success: true,
      message: "Game updated",
      game: mapGame(game),
    });
  } catch (e) {
    console.error("UPDATE game error:", e?.message || e);
    return res.status(500).json({ success: false, message: "Failed to update game" });
  }
});

/**
 * --------------------------------------------------
 * ADMIN: TOGGLE ACTIVE
 * POST /api/admin/games/:id/toggle
 * --------------------------------------------------
 */
router.post("/admin/games/:id/toggle", adminAuth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: "Game not found" });

    game.active = !game.active;
    await game.save();

    return res.json({ success: true, active: game.active, game: mapGame(game) });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Failed to toggle game" });
  }
});

module.exports = router;
