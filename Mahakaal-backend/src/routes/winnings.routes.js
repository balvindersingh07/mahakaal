// src/routes/winnings.routes.js
const router = require("express").Router();
const protect = require("../middleware/auth");

const { myWinnings } = require("../controllers/winnings.controller");

router.get("/winnings", protect, myWinnings);

module.exports = router;
