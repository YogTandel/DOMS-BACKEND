require("dotenv").config();
const superAdmin = require("../models/superAdminModel.js");
const jwt = require("jsonwebtoken");
const validator = require("../Middlewares/validator.js");
const {
  doHash,
  doHashValidation,
  hmacProcess,
} = require("../utils/hashing.js");
const { transport } = require("../Middlewares/sendMail.js");
const SECRET_KEY = process.env.JWT_SECRET_KEY;

const SuperAdminSignup = async (req, res) => {
  const { email, password } = req.body;
  console.log("Request Body for Signup:", req.body);

  try {
    const { error, value } = validator.signupSchema.validate({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.log(
        "SuperAdmin Signup Validation Error:",
        error.details[0].message
      );
      return res
        .status(404)
        .json({ success: false, message: error.details[0].message });
    }
    console.log("SuperAdmin Signup Validation Passed:", value);

    const existingSuperAdmin = await superAdmin.findOne({
      email: email.toLowerCase(),
    });

    if (existingSuperAdmin) {
      console.log(
        "Signup Attempt: SuperAdmin Already exists with Email:",
        email
      );
      return res.status(404).json({
        success: false,
        message: "❌ SuperAdmin Already Exist!",
      });
    }

    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    console.log("Generated Token:", token);

    const hashedPassword = await doHash(password, 12);
    console.log("Hashed Password For Signup", hashedPassword);

    // Get current date in yyyy-mm-dd format
    const currentDate = new Date().toISOString().split("T")[0];

    const newSuperAdmin = new superAdmin({
      email: email.toLowerCase(),
      password: hashedPassword,
      date: currentDate, // Automatically set the current date in yyyy-mm-dd format
      role: "superadmin", // Explicitly setting the role to 'superadmin'
    });

    const result = await newSuperAdmin.save();
    console.log("New SuperAdmin Created:", result);

    result.password = undefined;

    // Send Email
    console.log("Preparing to send email...");
    const info = await transport.sendMail({
      from: "Dynamic Order Management System Made By YOG TANDEL",
      to: email,
      subject: "✅ Signup Successful - Welcome!",
      text: "Thank you for signing up as a SuperAdmin. Your account has been successfully created!",
      html: /*HTML*/ `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: rgb(134, 34, 210);">Welcome to Dynamic Order Management System Made!</h2>
          <p>Hi <strong>${email}</strong>,</p>
          <p>Thank you for signing up as a SuperAdmin. Your account has been successfully created!</p>
          <hr style="border: 1px solid #ddd;" />
          <p>
            If you have any questions or need assistance, feel free to contact our support team.
          </p>
          <p style="margin-top: 20px;">Best Regards,<br><strong>Dynamic Order Management System Made Team</strong></p>
        </div>
      `,
    });

    console.log(`Email sent successfully to ${email}`);
    console.log("Email Info:", info);

    res.status(200).json({
      success: true,
      message: "🫡 Your SuperAdmin account has been created successfully",
      token,
      result,
    });
  } catch (error) {
    console.error("Error in Signup:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const SuperAdminSignin = async (req, res) => {
  const { email, password } = req.body;
  console.log("Request Body for SuperAdmin Signin:", req.body);

  try {
    // Validate input
    const { error, value } = validator.signinSchema.validate({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.error(
        "SuperAdmin Signin Validation Error:",
        error.details[0].message
      );
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    console.log("SuperAdmin Signin Validation Passed:", value);

    // Check if SuperAdmin exists
    const existingSuperAdmin = await superAdmin
      .findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!existingSuperAdmin) {
      console.warn("Signin Attempt: SuperAdmin not found with email:", email);
      return res
        .status(404)
        .json({ success: false, message: "❌ SuperAdmin does not exist!" });
    }
    console.log("SuperAdmin Found for Signin:", existingSuperAdmin);

    // Validate password
    const isPasswordValid = await doHashValidation(
      password,
      existingSuperAdmin.password
    );
    if (!isPasswordValid) {
      console.warn("Signin Attempt: Invalid password for email:", email);
      return res
        .status(401)
        .json({ success: false, message: "❌ Invalid credentials!" });
    }
    console.log("✅ Password Validated for Signin:", email);

    // ✅ Store SuperAdmin session in MongoDB
    req.session.user = {
      id: existingSuperAdmin._id,
      email: existingSuperAdmin.email,
      role: "superadmin",
      enable: existingSuperAdmin.enable || false,
    };
    console.log("✅ Session Stored:", req.session.user);

    // ✅ Create JWT Token
    const token = jwt.sign(
      {
        userId: existingSuperAdmin._id,
        email: existingSuperAdmin.email,
        role: "superadmin",
        enable: existingSuperAdmin.enable || false,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );
    console.log("✅ JWT Token Generated for SuperAdmin Signin:", token);

    // ✅ Store JWT in an HTTP-Only Cookie
    res.cookie("Authorization", token, {
      maxAge: 3600000, // 1 hour
      httpOnly: true,
      secure: true, // ✅ Ensure it's secure
      sameSite: "None", // ✅ Required for cross-site cookies
    });

    return res.json({
      success: true,
      message: "✅ SuperAdmin logged in successfully",
      session: req.session.user, // ✅ Send session data to frontend
      token, // ✅ Send token for frontend usage
    });
  } catch (error) {
    console.error("❌ Error in SuperAdmin Signin:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const SuperAdminSignout = async (req, res) => {
  try {
    console.log("Request Cookies:", req.cookies);
    res.clearCookie("Authorization");
    // Destroy the session to log out the admin
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "❌ Error during admin signout",
        });
      }

      // Clear the session cookie from the browser
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // "None" for HTTPS, "Lax" for local dev
      });

      console.log("✅ SuperAdmin logged out successfully.");

      res.status(200).json({
        success: true,
        message: "✅ Logged out successfully",
      });
    });
  } catch (error) {
    console.error("❌ Error during signout:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong during signout",
    });
  }
};

const SuperAdminSendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    console.log(
      `Received request to send verification code to email: ${email}`
    );

    const existingSuperAdmin = await superAdmin.findOne({ email });
    if (!existingSuperAdmin) {
      console.warn(
        `Send Code Attempt Failed: User not found with email: ${email}`
      );
      return res
        .status(404)
        .json({ success: false, message: "❌ User does not exist!" });
    }

    if (existingSuperAdmin.verified) {
      console.log(`🫡 User with email ${email} is already verified.`);
      return res.status(400).json({
        success: true,
        message: "✅ You Are Already Verified",
      });
    }

    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated verification code: ${codeValue}`);

    let info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingSuperAdmin.email,
      subject: "🫂 Your Verification Code",
      html: `
        <div style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color:rgb(134, 34, 210); text-align: center;">Welcome to Dynamic Order Management System Made By YOG TANDEL!</h2>
        <p style="font-size: 16px;">Dear <strong>${
          existingSuperAdmin.email || "Super Admin"
        }</strong>,</p>
        <p style="font-size: 16px;">Thank you for signing up! To verify your email address, please use the following verification code:</p>
        <div style="font-size: 24px; font-weight: bold; color: rgb(134, 34, 210); text-align: center; margin: 20px 0; padding: 10px; border: 2px solid rgb(134, 34, 210); display: inline-block;">
          ${codeValue}
        </div>
        <p style="font-size: 16px;">This code is valid for 15 minutes. If you didn’t request this, please ignore this email.</p>
        <p style="font-size: 16px;">Best regards,</p>
        <p style="font-size: 16px;">The Dynamic Order Management System Made By YOG TANDEL</p>
        <footer style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
          <p>If you have any questions, feel free to contact us.</p>
        </footer>
      </div>`,
    });
    console.log(
      `Email sent status: ${
        info.accepted[0] === existingSuperAdmin.email ? "Success" : "Failed"
      }`
    );

    if (info.accepted[0] === existingSuperAdmin.email) {
      const hasedCodeValue = await hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      console.log(`Hashed verification code: ${hasedCodeValue}`);

      existingSuperAdmin.verificationCode = hasedCodeValue;
      existingSuperAdmin.verificationCodeValidation = Date.now();
      console.log(`Saving verification code and timestamp for user: ${email}`);
      await existingSuperAdmin.save();

      console.log(`Verification code successfully saved for user: ${email}`);
      return res.status(200).json({ success: true, message: "✅ Code Sent" });
    }
    console.warn(`Failed to send email to user: ${email}`);
    res.status(400).json({ success: false, message: "❌ Code sent failed" });
  } catch (error) {
    console.error("❌ Error during sending Verification Code:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong during sending Verification Code",
    });
  }
};

const superAdminverifyVerificationCode = async (req, res) => {
  const { email, providedCode } = req.body;
  console.log("🔍 Request received to verify code", { email, providedCode });

  try {
    console.log("✅ Validating input...");
    const { error, value } = validator.acceptCodeSchema.validate({
      email,
      providedCode,
    });

    if (error) {
      console.error("❌ Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    console.log("🔍 Searching for user in database...");
    const codeValue = providedCode.toString();
    const existingSuperAdmin = await superAdmin
      .findOne({ email })
      .select("+verificationCode +verificationCodeValidation");
    if (!existingSuperAdmin) {
      console.warn(`⚠️ User not found for email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "❌ User does not exist!" });
    }

    console.log("👤 SuperAdmin found:", { email });
    if (existingSuperAdmin.verified) {
      console.log(`✅ User with email ${email} is already verified.`);
      return res.status(400).json({
        success: true,
        message: "✅ You Are Already Verified",
      });
    }

    if (
      !existingSuperAdmin.verificationCode ||
      !existingSuperAdmin.verificationCodeValidation
    ) {
      console.warn(
        `⚠️ Verification code or validation timestamp is missing for email: ${email}`
      );
      return res.status(400).json({
        success: false,
        message:
          "❌ Something went wrong with verification code. Please try again.",
      });
    }

    console.log("🔐 Hashing provided code for comparison...");
    const hashedProvidedCode = await hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    console.log("🔍 Comparing hashed code with stored code...");
    console.log("Stored Hash:", existingSuperAdmin.verificationCode);
    console.log("Hashed Provided Code:", hashedProvidedCode);

    if (hashedProvidedCode === existingSuperAdmin.verificationCode) {
      console.log(`✅ Verification successful for email: ${email}`);
      existingSuperAdmin.verified = true;
      existingSuperAdmin.enable = true;
      existingSuperAdmin.verificationCode = undefined;
      existingSuperAdmin.verificationCodeValidation = undefined;

      console.log("💾 Saving user details...");
      await existingSuperAdmin.save();

      console.log(`🎉 Account verified successfully for email: ${email}`);

      // Send Email Notification
      console.log("Preparing to send verification success email...");
      const info = await transport.sendMail({
        from: "Dynamic Order Management System Made By YOG TANDEL",
        to: email,
        subject: "✅ Your Account Has Been Verified Successfully",
        text: "Your account has been successfully verified. You can now access all the features of the system.",
        html: /*HTML*/ `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: rgb(134, 34, 210);">Account Verification Successful</h2>
            <p>Hi <strong>${email}</strong>,</p>
            <p>Congratulations! Your account has been successfully verified. You can now access all the features of the Dynamic Order Management System.</p>
            <hr style="border: 1px solid #ddd;" />
            <p>
              If you did not request this verification, please contact our support team immediately.
            </p>
            <p style="margin-top: 20px;">Best Regards,<br><strong>Dynamic Order Management System Made Team</strong></p>
          </div>
        `,
      });

      console.log(`Email sent successfully to ${email}`);
      console.log("Email Info:", info);

      return res.status(200).json({
        success: true,
        message: "🫡 Your Account is verified successfully",
      });
    }

    console.error(`❌ Verification failed for email: ${email}`);
    return res.status(400).json({
      success: false,
      message: "🪦 Unexpected error occurred. Please try again.",
    });
  } catch (error) {
    console.error("❌ Error during verifying Verification Code:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong during verifying Verification Code",
    });
  }
};

const superAdminchangePassword = async (req, res) => {
  const { userId, verified } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    console.log(`🔐 Starting password change for userId: ${userId}`);

    const { error, value } = validator.changePasswordSchema.validate({
      oldPassword,
      newPassword,
    });
    if (error) {
      console.error("❌ Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    console.log("✅ Validation successful");

    if (!verified) {
      console.warn("⚠️ User is not verified");
      return res
        .status(401)
        .json({ success: false, message: "❌ Your account is not verified." });
    }

    const existingSuperAdmin = await superAdmin
      .findOne({ _id: userId })
      .select("+password");

    if (!existingSuperAdmin) {
      console.error("❌ User not found with userId:", userId);
      return res
        .status(404)
        .json({ success: false, message: "❌ User does not exist!" });
    }
    console.log(`✅ User found with userId: ${userId}`);

    const result = await doHashValidation(
      oldPassword,
      existingSuperAdmin.password
    );
    if (!result) {
      console.warn("🪦 Invalid old password for userId:", userId);
      return res
        .status(401)
        .json({ success: false, message: "🪦 Invalid old password" });
    }
    console.log("✅ Old password is valid");

    const hashedPassword = await doHash(newPassword, 12);
    existingSuperAdmin.password = hashedPassword;
    await existingSuperAdmin.save();
    console.log(`✅ Password changed successfully for userId: ${userId}`);

    // Send Email Notification
    console.log("Preparing to send password change email...");
    const info = await transport.sendMail({
      from: "Dynamic Order Management System Made By YOG TANDEL",
      to: existingSuperAdmin.email,
      subject: "🔐 Your Password Has Been Changed Successfully",
      text: "Your password has been changed successfully. If this was not you, please contact support immediately.",
      html: /*HTML*/ `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color:rgb(134, 34, 210);">Password Change Successful</h2>
          <p>Hi <strong>${existingSuperAdmin.email}</strong>,</p>
          <p>Your password has been changed successfully. If this was not you, please contact support immediately.</p>
          <hr style="border: 1px solid #ddd;" />
          <p>
            If you did not request this change, please reach out to our support team immediately.
          </p>
          <p style="margin-top: 20px;">Best Regards,<br><strong>Dynamic Order Management System Made Team</strong></p>
        </div>
      `,
    });

    console.log(`Email sent successfully to ${existingSuperAdmin.email}`);
    console.log("Email Info:", info);

    return res
      .status(200)
      .json({ success: true, message: "🫡 Password changed successfully" });
  } catch (error) {
    console.error("❌ Error during password change:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Internal Server Error. Please try again later.",
    });
  }
};

const superAdminSendForgotPasswordCode = async (req, res) => {
  const { email } = req.body;

  try {
    console.log(
      `Received request to send verification code to email: ${email}`
    );

    const existingSuperAdmin = await superAdmin.findOne({ email });
    if (!existingSuperAdmin) {
      console.warn(
        `Send Code Attempt Failed: User not found with email: ${email}`
      );
      return res
        .status(404) // Not Found
        .json({ success: false, message: "❌ User does not exist!" });
    }

    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated verification code: ${codeValue}`);

    let info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingSuperAdmin.email,
      subject: "➡️ Your Forgot Password Verification Code",
      html: /*HTML*/ `
        <div style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color:rgb(134, 34, 210); text-align: center;">Welcome to Dynamic Order Management System Made By YOG TANDEL!</h2>
        <p style="font-size: 16px;">Dear <strong>${
          existingSuperAdmin.name || "Super Admin"
        }</strong>,</p>
        <p style="font-size: 16px;">Thank you for signing up! To verify your email address, please use the following verification code:</p>
        <div style="font-size: 24px; font-weight: bold; color: rgb(134, 34, 210); text-align: center; margin: 20px 0; padding: 10px; border: 2px solid rgb(134, 34, 210); display: inline-block;">
          ${codeValue}
        </div>
        <p style="font-size: 16px;">This code is valid for 15 minutes. If you didn’t request this, please ignore this email.</p>
        <p style="font-size: 16px;">Best regards,</p>
        <p style="font-size: 16px;">The Dynamic Order Management System Made By YOG TANDEL</p>
        <footer style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
          <p>If you have any questions, feel free to contact us.</p>
        </footer>
      </div>`,
    });
    console.log(`Verification email sent to: ${existingSuperAdmin.email}`);
    console.log(
      `Email sent status: ${
        info.accepted[0] === existingSuperAdmin.email ? "Success" : "Failed"
      }`
    );

    if (info.accepted[0] === existingSuperAdmin.email) {
      const hasedCodeValue = await hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      console.log(`Hashed verification code: ${hasedCodeValue}`);

      existingSuperAdmin.forgotPasswordCode = hasedCodeValue;
      existingSuperAdmin.forgotPasswordCodeValidation = Date.now();
      console.log(`Saving verification code and timestamp for user: ${email}`);
      await existingSuperAdmin.save();

      console.log(`Verification code successfully saved for user: ${email}`);
      return res
        .status(200)
        .json({ success: true, message: "✅ Forgot Password Code Sent" });
    }

    console.warn(`Failed to send email to user: ${email}`);
    res.status(400).json({ success: false, message: "❌ Code sent failed" });
  } catch (error) {
    console.error("❌ Error during sending Verification Code:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong during sending Verification Code",
    });
  }
};

const superAdminverifyForgotPasswordCode = async (req, res) => {
  const { email, providedCode, newPassword } = req.body;
  console.log("🔍 Request received to verify forgot password code", {
    email,
    providedCode,
  });

  try {
    console.log("✅ Validating input...");
    const { error, value } = validator.acceptFPCodeSchema.validate({
      email,
      providedCode,
      newPassword,
    });

    if (error) {
      console.error("❌ Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    console.log("🔍 Searching for user in database...");
    const codeValue = providedCode.toString();
    const existingSuperAdmin = await superAdmin
      .findOne({ email })
      .select("+forgotPasswordCode +forgotPasswordCodeValidation");

    if (!existingSuperAdmin) {
      console.warn(`⚠️ User not found for email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "❌ User does not exist!" });
    }

    console.log("👤 User found:", { email });
    if (
      !existingSuperAdmin.forgotPasswordCode ||
      !existingSuperAdmin.forgotPasswordCodeValidation
    ) {
      console.warn(
        `⚠️ Verification code or validation timestamp is missing for email: ${email}`
      );
      return res.status(400).json({
        success: false,
        message:
          "❌ Something went wrong with verification code. Please try again.",
      });
    }

    console.log("🔐 Hashing provided code for comparison...");
    const hashedProvidedCode = await hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    console.log("🔍 Comparing hashed code with stored code...");
    console.log("Stored Hash:", existingSuperAdmin.forgotPasswordCode);
    console.log("Hashed Provided Code:", hashedProvidedCode);

    if (hashedProvidedCode === existingSuperAdmin.forgotPasswordCode) {
      console.log(`✅ Verification successful for email: ${email}`);
      const hashedPassword = await doHash(newPassword, 12);
      existingSuperAdmin.password = hashedPassword;
      existingSuperAdmin.forgotPasswordCode = undefined;
      existingSuperAdmin.forgotPasswordCodeValidation = undefined;

      console.log("💾 Saving user details...");
      await existingSuperAdmin.save();

      console.log(
        `🎉 Password has been updated successfully for email: ${email}`
      );

      // Send Email Notification
      console.log("Preparing to send password reset success email...");
      const info = await transport.sendMail({
        from: "Dynamic Order Management System Made By YOG TANDEL",
        to: email,
        subject: "✅ Password Reset Successful",
        text: "Your password has been successfully updated. You can now log in using your new password.",
        html: /*HTML*/ `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: rgb(134, 34, 210);">Password Reset Successful</h2>
            <p>Hi <strong>${email}</strong>,</p>
            <p>Your password has been successfully updated. You can now log in using your new password.</p>
            <hr style="border: 1px solid #ddd;" />
            <p>
              If you did not request this password reset, please contact our support team immediately.
            </p>
            <p style="margin-top: 20px;">Best Regards,<br><strong>Dynamic Order Management System Made Team</strong></p>
          </div>
        `,
      });

      console.log(`Email sent successfully to ${email}`);
      console.log("Email Info:", info);

      return res.status(200).json({
        success: true,
        message: "🫡 Your Password has been updated successfully.",
      });
    }

    console.error(`❌ Verification failed for email: ${email}`);
    return res.status(400).json({
      success: false,
      message: "🪦 Unexpected error occurred. Please try again.",
    });
  } catch (error) {
    console.error("❌ Error during verifying Forgot Password Code:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong during verifying Forgot Password Code",
    });
  }
};

const adminDisplay = async (req, res) => {
  console.log("Fetching list of all SuperAdmins...");
  try {
    const admins = await superAdmin.find({}, { password: 0 });
    if (admins.length === 0) {
      console.log("No SuperAdmins found.");
      return res.status(404).json({
        success: false,
        message: "❌ No SuperAdmins found!",
      });
    }

    console.log("SuperAdmins fetched successfully:", admins);
    res.status(200).json({
      success: true,
      message: "✅ SuperAdmins fetched successfully",
      admins,
    });
  } catch (error) {
    console.error("Error fetching SuperAdmins:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong while fetching SuperAdmins",
    });
  }
};

module.exports = {
  SuperAdminSignup,
  SuperAdminSignin,
  SuperAdminSignout,
  SuperAdminSendVerificationCode,
  superAdminverifyVerificationCode,
  superAdminchangePassword,
  superAdminSendForgotPasswordCode,
  superAdminverifyForgotPasswordCode,
  adminDisplay,
};
