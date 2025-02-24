const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: "1h", // 1-hour expiration
  });
};

// Middleware to authenticate user
const isAuthenticated = (req, res, next) => {
  let token =
    req.headers["authorization"]?.split(" ")[1] || req.cookies["Authorization"];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "❌ No token provided!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    return res.status(401).json({
      success: false,
      message: "❌ Invalid or expired token!",
    });
  }
};

module.exports = { generateToken, isAuthenticated };
