// src/controllers/commission.controller.js
const mongoose = require("mongoose");
const Commission = require("../models/Commission");

const N = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const S = (v) => String(v || "").trim().toLowerCase();

/**
 * GET /api/commission/summary
 *
 * Returns:
 * {
 *  success: true,
 *  summary: { totalAll, pendingAll, paidAll, totalPage, pendingPage, paidPage },
 *  rows: [...],
 *  items: [...],
 *  commissions: [...],
 *  page, limit
 * }
 *
 * ✅ frontend-safe: rows/items/commissions all same array
 * ✅ totals are ALWAYS numbers (never null)
 */
exports.getCommissionSummary = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const limitRaw = Number(req.query.limit);
    const pageRaw = Number(req.query.page);

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const skip = (page - 1) * limit;

    const statusQ = req.query.status ? S(req.query.status) : "";

    // ✅ page/list query (can be filtered)
    const qPage = { user: userId };
    if (statusQ && (statusQ === "pending" || statusQ === "paid")) {
      qPage.status = statusQ;
    }

    // list (page)
    const rows = await Commission.find(qPage)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("fromUser", "username phone")
      .populate("bet", "_id total gameName createdAt")
      .lean();

    // page totals
    let totalPage = 0;
    let pendingPage = 0;
    let paidPage = 0;

    for (const c of rows) {
      const amt = N(c.amount);
      totalPage += amt;

      const st = S(c.status);
      if (st === "pending") pendingPage += amt;
      if (st === "paid") paidPage += amt;
    }

    // ✅ ALL totals (overall, not filtered by status)
    const qAll = { user: userId };

    let totalAll = 0;
    let pendingAll = 0;
    let paidAll = 0;

    try {
      const agg = await Commission.aggregate([
        { $match: qAll },
        {
          $group: {
            _id: "$status",
            sum: { $sum: "$amount" },
          },
        },
      ]);

      for (const g of agg || []) {
        const st = S(g._id);
        const sum = N(g.sum);
        totalAll += sum;
        if (st === "pending") pendingAll += sum;
        if (st === "paid") paidAll += sum;
      }
    } catch {
      // ignore aggregation errors, keep zeros
    }

    return res.json({
      success: true,
      summary: {
        totalAll,
        pendingAll,
        paidAll,
        totalPage,
        pendingPage,
        paidPage,
      },
      rows,
      items: rows,
      commissions: rows,
      page,
      limit,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Commission summary failed",
      error: e?.message || String(e),
    });
  }
};
