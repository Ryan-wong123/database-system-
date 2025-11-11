// server.js
require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const redis = require("redis");
const cors = require("cors");
const { decodeToken } = require("./middleware/auth");

// routes
const authRoutes = require("./routes/auth");
const foodItemRoutes = require("./routes/fooditem");
const foodCategoryRoutes = require("./routes/foodcategory");
const donationRoutes = require("./routes/donation");
const miscRoutes = require("./routes/misc");
const adminRoutes = require("./routes/admin");
const householdRoutes = require("./routes/household");
const dietRoute = require("./routes/diet");

const bookings = require('./routes/bookings');
const bookinghistory = require('./routes/bookinghistory');
const recommendationRoutes = require("./routes/recommendations");
const profileRoutes = require("./routes/profile");

const {startInventoryCron, startFoodEmbeddingCron, startHouseholdEmbeddingCron} = require("./jobs/scheduler");

// app setup
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// ✅ Decode JWT BEFORE protected routes
app.use(decodeToken);

// ✅ Log every request (helpful for debugging)
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ----- PUBLIC ROUTES -----
app.get("/", (_req, res) => res.send("OK"));
app.use("/", miscRoutes);
app.use("/auth", authRoutes);
app.use("/api/fooditem", foodItemRoutes);
app.use("/api/foodcategory", foodCategoryRoutes);
app.use("/api/diet", dietRoute);

app.use('/bookings',bookings );
app.use('/bookings/history', bookinghistory);
// ----- PROTECTED ROUTES -----
app.use("/donation", donationRoutes);
app.use("/admin", adminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/households", householdRoutes);
app.use("/recommendations", recommendationRoutes);
app.use("/profile", profileRoutes);

// --- Cron Jobs ---
startInventoryCron();
startFoodEmbeddingCron();
startHouseholdEmbeddingCron();

// ----- MongoDB -----
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
}

// ----- Redis -----
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect()
    .then(() => console.log("✅ Connected to Redis Cloud"))
    .catch(err => console.error("❌ Redis connection error:", err));
}

// ----- Error handler -----
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ----- Start server -----
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));