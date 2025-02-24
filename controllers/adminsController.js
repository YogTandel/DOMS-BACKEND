require("dotenv").config();
const admins = require("../models/adminsModel.js");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET_KEY;
const validator = require("../Middlewares/validator.js");
const {
  doHash,
  doHashValidation,
  hmacProcess,
} = require("../utils/hashing.js");
const { transport } = require("../Middlewares/sendMail.js");

const AdminsSignup = async (req, res) => {
  let { email, password, role } = req.body; // 🚀 Accept role dynamically
  console.log("Request Body for Admin Signup:", req.body);

  try {
    // 🔹 Assign role dynamically based on custom logic (optional)
    if (!role) {
      role = "admin"; // Default role if not provided
    }

    console.log(`📌 Assigned Role: ${role}`);

    // Validate input (role is now dynamic)
    const { error, value } = validator.signupSchema.validate({
      email: email.toLowerCase(),
      password,
      role: role.toLowerCase(), // ✅ No predefined roles, fully dynamic
    });

    if (error) {
      console.log("Admins Signup Validation Error:", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    console.log("Admins Signup Validation Passed:", value);

    // Check if the Admin already exists
    const existingAdmin = await admins.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      console.log("Signup Attempt: Admin Already Exists with Email:", email);
      return res.status(400).json({
        success: false,
        message: "❌ Admin Already Exists!",
      });
    }

    // Store plain password temporarily
    const plainPassword = password;

    // Generate JWT token
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    console.log("Generated Token:", token);

    // Hash the password before saving
    const hashedPassword = await doHash(password, 12);
    console.log("Hashed Password for Admin Signup:", hashedPassword);

    // Get current date in yyyy-mm-dd format
    const currentDate = new Date().toISOString().split("T")[0];

    // Create a new Admin instance
    const newAdmin = new admins({
      email: email.toLowerCase(),
      password: hashedPassword,
      date: currentDate,
      role: role.toLowerCase(), // ✅ Role is now fully dynamic
      verified: false, // Default not verified
      isEnable: false, // Default disabled
    });

    const result = await newAdmin.save();
    console.log("New Admin Created:", result);

    // Send Email (Only plain password is in the email, not API response)
    console.log("Preparing to send email...");
    const info = await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "✅ Admin Account Created by SuperAdmin",
      html: /*HTML*/ `
        <div style="font-family: Arial, sans-serif; color: #333; background: #f4f4f4; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #6c63ff;">✅ Admin Account Created</h2>
          <p>Hello <strong>${email}</strong>,</p>
          <p>Your admin account has been successfully created.</p>
          <p>You can now log in to the system using the following details:</p>
          <h3 style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; border: 2px dashed #6c63ff; color: #6c63ff;">Email: ${email}</h3>
          <h3 style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; border: 2px dashed #6c63ff; color: #6c63ff;">Password: ${plainPassword}</h3>
          <p>Role: <strong>${role}</strong></p>
          <p>Please change your password upon first login for security purposes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr style="border: 1px solid #ddd; margin-top: 20px;">
          <p style="font-size: 12px; color: #888;">Dynamic Order Management System</p>
        </div>
      `,
    });

    console.log(`Email sent successfully to ${email}`);
    console.log("Email Info:", info);

    // Respond with signup success and plain password
    res.status(200).json({
      success: true,
      message:
        "✅ The Admin account has been created successfully by SuperAdmin",
      token,
      result: {
        email: result.email,
        role: result.role,
        date: result.date,
        password: plainPassword, // ✅ Sending the password in the response
      },
    });
  } catch (error) {
    console.error("Error in Admin Signup:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const AdminsSignin = async (req, res) => {
  const { email, password } = req.body;
  console.log("Request Body for Admins Signin:", req.body);

  try {
    // Validate input
    const { error, value } = validator.signinSchema.validate({
      email: email.toLowerCase(),
      password,
    });
    if (error) {
      console.error("Admin Signin Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    console.log("Admins Signin Validation Passed:", value);

    // Check if Admin exists
    const existingAdmin = await admins
      .findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!existingAdmin) {
      console.warn("Signin Attempt: Admin not found with email:", email);
      return res
        .status(404)
        .json({ success: false, message: "❌ Admin does not exist!" });
    }
    console.log("Admin Found for Signin:", existingAdmin);

    // Validate password
    const isPasswordValid = await doHashValidation(
      password,
      existingAdmin.password
    );
    if (!isPasswordValid) {
      console.warn("Signin Attempt: Invalid password for email:", email);
      return res
        .status(401)
        .json({ success: false, message: "❌ Invalid credentials!" });
    }
    console.log("Password Validated for Signin:", email);

    // Generate JWT Token
    const token = jwt.sign(
      {
        userId: existingAdmin._id,
        email: existingAdmin.email,
        role: existingAdmin.role, // ✅ Dynamic role
        isEnable: existingAdmin.isEnable || false,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );
    console.log("✅ JWT Token Generated for Admin Signin:", token);

    // ✅ Store session in MongoDB
    req.session.user = {
      id: existingAdmin._id,
      email: existingAdmin.email,
      role: existingAdmin.role, // ✅ Dynamic role
    };
    console.log("✅ Session Stored:", req.session.user);

    // ✅ Store JWT in HTTP-Only Cookie
    res.cookie("Authorization", token, {
      maxAge: 3600000, // 1 hour
      httpOnly: true,
      secure: true, // ✅ Ensure it's secure
      sameSite: "None", // ✅ Required for cross-site cookies
    });

    return res.json({
      success: true,
      message: "✅ Admin logged in successfully",
      token, // ✅ Send token for frontend usage
      session: req.session.user, // ✅ Send session data to frontend
    });
  } catch (error) {
    console.error("❌ Error in Admin Signin:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const AdminsSignout = async (req, res) => {
  try {
    console.log("Request Cookies:", req.cookies);

    // Destroy the session to log out the admin
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Error during admin signout:", err);
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

      console.log("✅ Admin logged out successfully.");
      return res.status(200).json({
        success: true,
        message: "✅ Admin logged out successfully",
      });
    });
  } catch (error) {
    console.error("❌ Error during admin signout:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong during admin signout",
    });
  }
};

const AdminsSendVerificationCode = async (req, res) => {
  const { email } = req.body;
  console.log("🔍 Received Admin Email for Verification Code:", email);

  try {
    // Check if Admin exists
    const existingAdmin = await admins.findOne({ email: email.toLowerCase() });
    if (!existingAdmin) {
      console.warn("❌ Admin Not Found for Email:", email);
      return res
        .status(404)
        .json({ success: false, message: "❌ Admin does not exist!" });
    }

    if (existingAdmin.verified) {
      console.log(`🫡 Admin with email ${email} is already verified.`);
      return res.status(400).json({
        success: true,
        message: "✅ Admin is already verified",
      });
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    console.log(`Generated verification code: ${verificationCode}`);

    // Hash verification code
    const hashedCode = await hmacProcess(
      verificationCode,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    console.log(`Hashed verification code: ${hashedCode}`);

    // Save hashed verification code in the database with expiration time of 10 minutes
    existingAdmin.verificationCode = hashedCode;
    existingAdmin.verificationCodeValidation = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await existingAdmin.save();

    // Construct email with proper design
    const emailHTML = /*HTML*/ `
      <div style="font-family: Arial, sans-serif; color: #333; background: #f4f4f4; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #6c63ff;">🔐 Admin Verification Code</h2>
        <p>Hello <strong>${email}</strong>,</p>
        <p>Your verification code is:</p>
        <h1 style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; border: 2px dashed #6c63ff; color: #6c63ff;">${verificationCode}</h1>
        <p>This code will expire in <strong>10 minutes</strong>. Please do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: 1px solid #ddd; margin-top: 20px;">
        <p style="font-size: 12px; color: #888;">Dynamic Order Management System</p>
      </div>
    `;

    // Send the email
    const info = await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "🔐 Your Verification Code",
      html: emailHTML,
    });

    console.log(`📧 Verification Code Sent Successfully to ${email}`);
    console.log("Verification Email Info:", info);
    return res.status(200).json({ success: true, message: "✅ Code Sent" });
  } catch (error) {
    console.error("❌ Error in AdminSendVerificationCode:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const AdminsVerifyVerificationCode = async (req, res) => {
  const { email, providedCode } = req.body;
  console.log("🔍 Request received to verify code", { email, providedCode });

  try {
    console.log("✅ Validating input...");
    const { error } = validator.acceptCodeSchema.validate({
      email,
      providedCode,
    });
    if (error) {
      console.error("❌ Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    console.log("🔍 Searching for admin in database...");
    const existingAdmin = await admins
      .findOne({ email })
      .select("+verificationCode +verificationCodeValidation");

    if (!existingAdmin) {
      console.warn(`⚠️ Admin not found for email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "❌ Admin does not exist!" });
    }

    console.log("👤 Admin found:", { email });
    if (existingAdmin.verified) {
      console.log(`✅ Admin with email ${email} is already verified.`);
      return res
        .status(400)
        .json({ success: true, message: "✅ You Are Already Verified" });
    }

    if (
      !existingAdmin.verificationCode ||
      !existingAdmin.verificationCodeValidation
    ) {
      console.warn(
        `⚠️ Verification code or validation timestamp is missing for email: ${email}`
      );
      return res.status(400).json({
        success: false,
        message: "❌ Invalid or expired verification code.",
      });
    }

    console.log("🔐 Hashing provided code for comparison...");
    const hashedProvidedCode = await hmacProcess(
      providedCode,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    console.log("🔍 Comparing hashed code with stored code...");
    if (hashedProvidedCode !== existingAdmin.verificationCode) {
      console.error(`❌ Verification failed for email: ${email}`);
      return res
        .status(400)
        .json({ success: false, message: "❌ Incorrect verification code." });
    }

    console.log(`✅ Verification successful for email: ${email}`);
    existingAdmin.verified = true;
    existingAdmin.isEnable = true;
    existingAdmin.verificationCode = undefined;
    existingAdmin.verificationCodeValidation = undefined;

    console.log("💾 Saving admin details...");
    await existingAdmin.save();

    console.log(`🎉 Admin account verified successfully for email: ${email}`);

    // Send Email Notification
    console.log("Preparing to send verification success email...");
    await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "✅ Your Admin Account Has Been Verified Successfully",
      html: /*HTML*/ `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4CAF50; text-align: center;">🎉 Admin Account Verified Successfully!</h2>
          <p>Hi <strong>${email}</strong>,</p>
          <p>Your admin account has been successfully verified. You now have full access to the <strong>Dynamic Order Management System</strong>.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://doms-yog.vercel.app/" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: #fff; text-decoration: none; font-size: 16px; border-radius: 5px;">Login to Your Account</a>
          </div>
          <p>If you did not request this verification, please contact our support team immediately.</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;" />
          <p style="text-align: center; font-size: 14px; color: #888;">Best Regards,<br><strong>Dynamic Order Management System Team</strong><br><a href="https://doms-yog.vercel.app/" style="color: #555; text-decoration: none;">Visit Our Website</a></p>
        </div>
      `,
    });

    console.log(`📧 Email sent successfully to ${email}`);
    return res.status(200).json({
      success: true,
      message: "🫡 Your Admin Account is verified successfully",
    });
  } catch (error) {
    console.error("❌ Error during verifying Verification Code:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong during verification.",
    });
  }
};

const AdminsChangePassword = async (req, res) => {
  const { userId } = req.user; // Removed `verified` to fetch it dynamically
  const { oldPassword, newPassword } = req.body;

  try {
    console.log("🔐 Starting password change for userId:", userId);
    console.log("🔍 User Data from Token:", req.user); // Debugging JWT payload

    // Validate input
    const { error } = validator.changePasswordSchema.validate({
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

    // Fetch admin details including 'verified' from the database
    const existingAdmin = await admins
      .findOne({ _id: userId })
      .select("+password +verified"); // Ensure 'verified' is retrieved

    if (!existingAdmin) {
      console.error("❌ Admin not found with userId:", userId);
      return res
        .status(404)
        .json({ success: false, message: "❌ Admin does not exist!" });
    }
    console.log(`✅ Admin found with userId: ${userId}`);

    // Check if the admin is verified
    if (!existingAdmin.verified) {
      console.warn("⚠️ Admin is not verified in DB");
      return res
        .status(401)
        .json({ success: false, message: "❌ Your account is not verified." });
    }

    // Validate old password
    const result = await doHashValidation(oldPassword, existingAdmin.password);
    if (!result) {
      console.warn("🪦 Invalid old password for userId:", userId);
      return res
        .status(401)
        .json({ success: false, message: "🪦 Invalid old password" });
    }
    console.log("✅ Old password is valid");

    // Hash the new password
    const hashedPassword = await doHash(newPassword, 12);
    existingAdmin.password = hashedPassword;
    await existingAdmin.save();
    console.log(`✅ Password changed successfully for userId: ${userId}`);

    // Send Email Notification
    console.log("📧 Preparing to send password change confirmation email...");
    await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: existingAdmin.email,
      subject: "🔐 Your Admin Password Has Been Changed Successfully",
      html: `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: rgb(134, 34, 210); text-align: center;">🔐 Password Change Successful</h2>
          <p>Hi <strong>${existingAdmin.email}</strong>,</p>
          <p>Your password has been changed successfully. If this was not you, please contact support immediately.</p>
          <hr style="border: 1px solid #ddd;" />
          <p>If you did not request this change, please reach out to our support team immediately.</p>
          <p style="text-align: center; font-size: 14px; color: #888;">Best Regards,<br><strong>Dynamic Order Management System Team</strong></p>
        </div>
      `,
    });

    console.log(`📧 Email sent successfully to ${existingAdmin.email}`);

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

const AdminsSendForgotPasswordCode = async (req, res) => {
  const { email } = req.body;

  try {
    console.log(
      `📩 Received request to send forgot password code to: ${email}`
    );

    // Check if the Admin exists
    const existingAdmin = await admins.findOne({ email });
    if (!existingAdmin) {
      console.warn(
        `⚠️ Send Code Attempt Failed: User not found for email: ${email}`
      );
      return res
        .status(404)
        .json({ success: false, message: "❌ User does not exist!" });
    }

    // Generate a 6-digit verification code
    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔢 Generated verification code: ${codeValue}`);

    // Hash the verification code before saving it
    const hashedCodeValue = await hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    console.log(`🔒 Hashed verification code stored for security.`);

    // Update the admin record with the hashed code and timestamp
    existingAdmin.forgotPasswordCode = hashedCodeValue;
    existingAdmin.forgotPasswordCodeValidation = Date.now();
    await existingAdmin.save();
    console.log(`💾 Verification code saved for user: ${email}`);

    // Send the verification code via email
    const info = await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: existingAdmin.email,
      subject: "🔑 Reset Your Password - Verification Code",
      html: /*HTML*/ `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color:rgb(134, 34, 210); text-align: center;">🔑 Password Reset Request</h2>
          <p>Hi <strong>${existingAdmin.name || "Admin"}</strong>,</p>
          <p>We received a request to reset your password. Use the verification code below to proceed:</p>
          <div style="font-size: 24px; font-weight: bold; color: rgb(134, 34, 210); text-align: center; margin: 20px 0; padding: 10px; border: 2px solid rgb(134, 34, 210); display: inline-block;">
            ${codeValue}
          </div>
          <p>This code is valid for <strong>15 minutes</strong>. If you did not request this, please ignore this email.</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;" />
          <p style="text-align: center; font-size: 14px; color: #888;">Best Regards,<br><strong>Dynamic Order Management System Team</strong></p>
        </div>
      `,
    });

    // Log email status
    if (info.accepted.includes(existingAdmin.email)) {
      console.log(
        `📧 Verification email sent successfully to: ${existingAdmin.email}`
      );
      return res
        .status(200)
        .json({ success: true, message: "✅ Forgot Password Code Sent" });
    }

    console.warn(`⚠️ Email sending failed for user: ${email}`);
    return res
      .status(400)
      .json({ success: false, message: "❌ Code sending failed" });
  } catch (error) {
    console.error("❌ Error during sending Forgot Password Code:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Internal Server Error. Please try again later.",
    });
  }
};

const AdminsVerifyForgotPasswordCode = async (req, res) => {
  const { email, providedCode, newPassword } = req.body;
  console.log("🔍 Request received to verify forgot password code", {
    email,
    providedCode,
  });

  try {
    console.log("✅ Validating input...");
    const { error } = validator.acceptFPCodeSchema.validate({
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
    const existingAdmin = await admins
      .findOne({ email })
      .select("+forgotPasswordCode +forgotPasswordCodeValidation");

    if (!existingAdmin) {
      console.warn(`⚠️ User not found for email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "❌ User does not exist!" });
    }

    console.log("👤 User found:", { email });

    if (
      !existingAdmin.forgotPasswordCode ||
      !existingAdmin.forgotPasswordCodeValidation
    ) {
      console.warn(
        `⚠️ Missing verification code or timestamp for email: ${email}`
      );
      return res.status(400).json({
        success: false,
        message:
          "❌ Invalid or expired verification code. Please request a new one.",
      });
    }

    console.log("🔐 Hashing provided code for comparison...");
    const hashedProvidedCode = await hmacProcess(
      providedCode.toString(),
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    console.log("🔍 Comparing hashed code with stored code...");
    if (hashedProvidedCode !== existingAdmin.forgotPasswordCode) {
      console.error(`❌ Incorrect verification code for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: "❌ Incorrect verification code. Please try again.",
      });
    }

    console.log(`✅ Verification successful for email: ${email}`);

    // Hash new password
    const hashedPassword = await doHash(newPassword, 12);
    existingAdmin.password = hashedPassword;
    existingAdmin.forgotPasswordCode = undefined;
    existingAdmin.forgotPasswordCodeValidation = undefined;

    console.log("💾 Saving new password...");
    await existingAdmin.save();

    console.log(
      `🎉 Password has been updated successfully for email: ${email}`
    );

    // Send Email Notification
    console.log("📩 Sending password reset success email...");
    await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "✅ Password Reset Successful",
      html: /*HTML*/ `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: rgb(134, 34, 210); text-align: center;">🔑 Password Reset Successful</h2>
          <p>Hi <strong>${email}</strong>,</p>
          <p>Your password has been successfully updated. You can now log in using your new password.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://doms-yog.vercel.app/" style="display: inline-block; padding: 12px 24px; background-color: rgb(134, 34, 210); color: #fff; text-decoration: none; font-size: 16px; border-radius: 5px;">Login to Your Account</a>
          </div>
          <p>If you did not request this password reset, please contact our support team immediately.</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;" />
          <p style="text-align: center; font-size: 14px; color: #888;">Best Regards,<br><strong>Dynamic Order Management System Team</strong></p>
        </div>
      `,
    });

    console.log(`📧 Email sent successfully to ${email}`);

    return res.status(200).json({
      success: true,
      message: "✅ Your password has been updated successfully.",
    });
  } catch (error) {
    console.error("❌ Error during verifying Forgot Password Code:", error);
    return res.status(500).json({
      success: false,
      message:
        "❌ Something went wrong during verification. Please try again later.",
    });
  }
};

const displayAllAdmins = async (req, res) => {
  console.log("🔍 Request received to display all admin data");

  try {
    if (!req.user) {
      console.warn("⚠️ Unauthorized access attempt. No user token found.");
      return res.status(401).json({
        success: false,
        message: "❌ Unauthorized. Please log in first.",
      });
    }

    console.log(
      `🔐 Authorized user: ${req.user.email} (Role: ${req.user.role})`
    );

    console.log("🔍 Fetching all admins from the database...");

    const allAdmins = await admins.find().select("-password").lean();

    if (!allAdmins || allAdmins.length === 0) {
      console.warn("⚠️ No admins found in the database.");
      return res.status(404).json({
        success: false,
        message: "❌ No admins found!",
      });
    }

    console.log(`👤 Found ${allAdmins.length} admins`);

    return res.status(200).json({
      success: true,
      message: "✅ Admin data retrieved successfully",
      totalAdmins: allAdmins.length,
      data: allAdmins.map(
        ({ _id, name, email, role, date, createdAt, updatedAt, enable }) => ({
          id: _id, // ✅ Include unique ID
          name,
          email,
          role,
          date,
          createdAt,
          updatedAt,
          status: enable ? "Active" : "Disabled", // ✅ Use more descriptive status
        })
      ),
    });
  } catch (error) {
    console.error("❌ Error retrieving admin data:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong while retrieving admin data",
    });
  }
};

module.exports = {
  AdminsSignup,
  AdminsSignin,
  AdminsSignout,
  AdminsSendVerificationCode,
  AdminsVerifyVerificationCode,
  AdminsChangePassword,
  AdminsSendForgotPasswordCode,
  AdminsVerifyForgotPasswordCode,
  displayAllAdmins,
};
