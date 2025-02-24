const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET_KEY;

// ✅ Verify Token API (Read from Cookies)
router.get("/auth/verifyToken", (req, res) => {
  const token = req.cookies.token; // ✅ Read from cookies
  // const token = req.cookies.token || req.headers.authorization?.split(" ")[1]; // ✅ Read from cookies or headers

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "❌ No Token Provided" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error("JWT Verification Error:", err);
      return res
        .status(403)
        .json({ success: false, message: "❌ Invalid Token" });
    }

    console.log("✅ Token Verified Successfully:", decoded);

    return res.json({
      success: true,
      user: decoded, // Send back user info for frontend to store
    });
  });
});

router.get("/auth/session", (req, res) => {
  if (req.session.user) {
    return res.json({
      success: true,
      session: req.session.user, 
    });
  }
  return res.json({ success: false, message: "❌ No active session" });
});

module.exports = router;
