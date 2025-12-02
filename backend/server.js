import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import adminRoutes from "./routes/adminRoutes.js";
import retailerRoutes from "./routes/retailerRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import careerRoutes from "./routes/careerRoutes.js"; // ✅ added
import contactRoutes from "./routes/contactUsRoutes.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MongoDB Connection =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
    process.exit(1);
  }
};

connectDB();

// ===== Middleware =====
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow from everywhere
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); 
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===== Routes =====
app.use("/api/admin", adminRoutes);
app.use("/api/retailer", retailerRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/career", careerRoutes); // ✅ Career API
app.use("/api/contact", contactRoutes);
// ===== Health Check =====
app.get("/", (req, res) => {
  res.status(200).send("Supreme Backend API is running");
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

// ===== Start Server =====
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
