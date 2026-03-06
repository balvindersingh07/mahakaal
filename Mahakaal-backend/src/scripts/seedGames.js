// src/scripts/seedGames.js
require("dotenv").config();

const connectDB = require("../config/db");
const Game = require("../models/Game");

const games = [
  { name: "OLD DISAWAR",   openTime: "07:00", closeTime: "01:20", active: true, order: 1 },
  { name: "FARIDABAD",     openTime: "07:00", closeTime: "17:35", active: true, order: 2 },
  { name: "DISAWAR",       openTime: "07:00", closeTime: "02:10", active: true, order: 3 },
  { name: "GHAZIABAD",     openTime: "07:00", closeTime: "20:45", active: true, order: 4 },
  { name: "GALI",          openTime: "07:00", closeTime: "22:45", active: true, order: 5 },
  { name: "SHREE GANESH",  openTime: "07:00", closeTime: "16:05", active: true, order: 6 },
  { name: "DELHI BAZAR",   openTime: "07:00", closeTime: "14:35", active: true, order: 7 },
  { name: "PATNA",         openTime: "07:00", closeTime: "16:30", active: true, order: 8 },
  { name: "NEW FARIDABAD", openTime: "07:00", closeTime: "18:15", active: true, order: 9 },
];

(async () => {
  try {
    await connectDB();

    await Game.deleteMany({});
    await Game.insertMany(games);

    console.log(`✅ Games seeded successfully (${games.length})`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err?.message || err);
    process.exit(1);
  }
})();
