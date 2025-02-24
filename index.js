require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

const adminsRouter = require("./routers/adminsRouter.js");
const protectedRouter = require("./routers/protectedRouter.js");
const menuRouter = require("./routers/menuRouter.js");
const cookRouter = require("./routers/cookRouter.js");
const userRouter = require("./routers/userRouter.js");

const app = express();

// ✅ Trust Proxy for Secure Cookies on Vercel
app.set("trust proxy", 1);

// ✅ Allowed Origins for CORS (No trailing slashes!)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://doms-backend.vercel.app",
  "https://doms-yog.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // ✅ Required for cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle Preflight CORS Requests (OPTIONS)
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ MongoDB Session Store
const store = new MongoDBStore({
  uri: process.env.MONGO_URL,
  collection: "sessions",
});

// ✅ Express-Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      secure: false, // ✅ Only secure:true in production (Vercel)
      httpOnly: true,
      sameSite: "Lax", // ✅ Required for cross-origin cookies
      maxAge: 1000 * 60 * 60 * 24, // 1 Day
    },
  })
);

// ✅ Debugging Middleware for Errors
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// ✅ MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("🚀 Connected to MongoDB");
  } catch (error) {
    console.error("🪦 MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// ✅ Check Environment Variables
console.log("🔍 Checking Environment Variables...");
if (!process.env.MONGO_URL) console.error("❌ MONGO_URL is missing!");
if (!process.env.PORT) console.error("❌ PORT is missing!");
if (!process.env.JWT_SECRET_KEY) console.error("❌ SECRET_KEY is missing!");

// ✅ Debugging: Session Route
app.get("/session", (req, res) => {
  console.log("🔍 Session Data:", req.session); // Debug session
  if (req.session && req.session.user) {
    console.log("✅ Session Exists:", req.session.user);
    res.json({ success: true, session: req.session.user });
  } else {
    console.log("❌ No Active Session");
    res.json({ success: false, message: "No active session" });
  }
});

// ✅ API Health Check
app.get("/server", (req, res) => {
  console.log("✅ Server Connected");
  res.status(200).json({ success: true, message: "✅ You Are Good to Go" });
});

// ✅ Base API Route
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Welcome to the API!" });
});

// ✅ API Routes
app.use("/api/admins", adminsRouter);
app.use("/api", protectedRouter);
app.use("/api/menu", menuRouter);
app.use("/api/cook", cookRouter);
app.use("/api/user", userRouter);

// ✅ Start Server After DB Connection
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server Running on: http://localhost:${PORT}`);
  });
});
