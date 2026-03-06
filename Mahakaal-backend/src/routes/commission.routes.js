// src/routes/commission.routes.js
const router = require("express").Router();

// ✅ auth.js exports a FUNCTION directly
const protect = require("../middleware/auth");

const { getCommissionSummary } = require("../controllers/commission.controller");

router.get("/commission/summary", protect, getCommissionSummary);

module.exports = router;
