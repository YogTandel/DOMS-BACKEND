const jwt = require("jsonwebtoken");

const identifier = (req, res, next) => {
  let token;

  if (req.headers.client === "not-browser") {
    token = req.headers.authorization;
  } else {
    token = req.cookies["Authorization"];
  }

  console.log("🔍 Received Authorization Header:", req.headers.authorization);
  console.log("🔍 Token Before Splitting:", token);

  if (!token) {
    return res.status(403).json({ success: false, message: "🪦 Unauthorized" });
  }

  try {
    const userToken = token.split(" ")[1]; // Extract token after 'Bearer'
    console.log("🔍 Extracted Token:", userToken);

    const jwtVerified = jwt.verify(userToken, process.env.JWT_SECRET_KEY);
    console.log("✅ JWT Verified:", jwtVerified);

    if (jwtVerified) {
      req.user = jwtVerified;
      return next();
    }
  } catch (error) {
    console.error("❌ JWT Verification Error:", error.message);
    return res
      .status(403)
      .json({ success: false, message: "🪦 Unauthorized - Invalid Token" });
  }
};

module.exports = { identifier };
