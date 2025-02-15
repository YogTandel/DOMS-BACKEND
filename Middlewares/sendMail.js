const nodemailer = require("nodemailer");
require("dotenv").config(); // Load environment variables

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
    pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD, // Use an App Password
  },
});

// ✅ Verify SMTP connection
transport.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Failed:", error);
  } else {
    console.log("✅ SMTP Server is ready to send emails");
  }
});

module.exports = { transport };
