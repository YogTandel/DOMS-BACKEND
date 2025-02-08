require("dotenv").config();
const admin = require("../models/adminModel.js");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET_KEY;
const validator = require("../Middlewares/validator.js");
const {
  doHash,
  doHashValidation,
  hmacProcess,
} = require("../utils/hashing.js");
const { transport } = require("../Middlewares/sendMail.js");
const crypto = require("crypto");

const AdminSignup = async (req, res) => {
  const { email, password, role } = req.body;
  console.log("Request Body for Admin Signup:", req.body);

  try {
    // Validate input
    const { error, value } = validator.signupSchema.validate({
      email: email.toLowerCase(),
      password,
    });

    if (error) {
      console.log("Admin Signup Validation Error:", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    console.log("Admin Signup Validation Passed:", value);

    // Check if the Admin already exists
    const existingAdmin = await admin.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      console.log("Signup Attempt: Admin Already Exists with Email:", email);
      return res.status(400).json({
        success: false,
        message: "❌ Admin Already Exists!",
      });
    }

    // Store the plain password temporarily
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
    const newAdmin = new admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      date: currentDate,
      role: "admin", // ✅ Ensure only "Admin" is converted to lowercase
    });

    const result = await newAdmin.save();
    console.log("New Admin Created:", result);

    // Send Email (Only plain password is in the email, not API response)
    console.log("Preparing to send email...");
    const info = await transport.sendMail({
      from: "Dynamic Order Management System Made By YOG TANDEL",
      to: email,
      subject: "✅ Admin Account Created by SuperAdmin",
      html: /*HTML*/ `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: rgb(134, 34, 210);">Admin Account Created!</h2>
          <p>Hi <strong>${email}</strong>,</p>
          <p>Your admin account has been created by the SuperAdmin.</p>
          <p>You can now log in to the system using the following details:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> <em>${plainPassword}</em></li>
          </ul>
          <p>Please change your password upon first login for security purposes.</p>
          <hr style="border: 1px solid #ddd;" />
          <p style="margin-top: 20px;">Best Regards,<br><strong>Dynamic Order Management System Team</strong></p>
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

const AdminSignin = async (req, res) => {
  const { email, password } = req.body;
  console.log("Request Body for Admin Signin:", req.body);

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
    console.log("Admin Signin Validation Passed:", value);

    // Check if Admin exists
    const existingAdmin = await admin
      .findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!existingAdmin) {
      console.warn("Signin Attempt: Admin not found with email:", email);
      return res
        .status(404)
        .json({ success: false, message: "❌ Admin does not exist!" });
    }
    console.log("Admin Found for Signin:", existingAdmin);

    // Convert role to lowercase
    existingAdmin.role = existingAdmin.role.toLowerCase(); // ✅ Fix role casing

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
        role: existingAdmin.role, // ✅ Now always lowercase
        enable: existingAdmin.enable || false,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );
    console.log("✅ JWT Token Generated for Admin Signin:", token);

    // ✅ Store session in MongoDB
    req.session.user = {
      id: existingAdmin._id,
      email: existingAdmin.email,
      role: existingAdmin.role, // ✅ Now always lowercase
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

const AdminSignout = async (req, res) => {
  try {
    console.log("Request Cookies:", req.cookies);

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

      console.log("✅ Admin logged out successfully.");
      res.status(200).json({
        success: true,
        message: "✅ Admin logged out successfully",
      });
    });
  } catch (error) {
    console.error("❌ Error during admin signout:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong during admin signout",
    });
  }
};

const AdminSendVerificationCode = async (req, res) => {
  const { email } = req.body;
  console.log("🔍 Received Admin Email for Verification Code:", email);

  try {
    // Check if Admin exists
    const existingAdmin = await admin.findOne({ email: email.toLowerCase() });
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

    // Save verification code in the database (with expiration time of 10 minutes)
    existingAdmin.verificationCode = verificationCode;
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
    if (info.accepted[0] === existingAdmin.email) {
      const hasedCodeValue = await hmacProcess(
        verificationCode,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      console.log(`Hashed verification code: ${hasedCodeValue}`);

      existingAdmin.verificationCode = hasedCodeValue;
      existingAdmin.verificationCodeValidation = Date.now();
      console.log(`Saving verification code and timestamp for user: ${email}`);
      await existingAdmin.save();

      console.log(`Verification code successfully saved for admin: ${email}`);
      return res.status(200).json({ success: true, message: "✅ Code Sent" });
    }
    console.warn(`Failed to send email to admin: ${email}`);
    res.status(400).json({ success: false, message: "❌ Code sent failed" });
  } catch (error) {
    console.error("❌ Error in AdminSendVerificationCode:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const AdminVerifyVerificationCode = async (req, res) => {
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

    console.log("🔍 Searching for admin in database...");
    const codeValue = providedCode.toString();
    const existingAdmin = await admin
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
      return res.status(400).json({
        success: true,
        message: "✅ You Are Already Verified",
      });
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
    console.log("Stored Hash:", existingAdmin.verificationCode);
    console.log("Hashed Provided Code:", hashedProvidedCode);

    if (hashedProvidedCode === existingAdmin.verificationCode) {
      console.log(`✅ Verification successful for email: ${email}`);

      // Update admin status after successful verification
      existingAdmin.verified = true;
      existingAdmin.enable = true;
      existingAdmin.verificationCode = undefined; // Clear verification code
      existingAdmin.verificationCodeValidation = undefined; // Clear validation timestamp

      console.log("💾 Saving admin details...");
      await existingAdmin.save();

      console.log(`🎉 Admin account verified successfully for email: ${email}`);

      // Send Email Notification
      console.log("Preparing to send verification success email...");
      const info = await transport.sendMail({
        from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
        to: email,
        subject: "✅ Your Admin Account Has Been Verified Successfully",
        html: /*HTML*/ `
    <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; padding-bottom: 20px;">
        <img src="https://doms-front-end.vercel.app/logo.png" alt="Company Logo" style="width: 120px; height: auto;">
      </div>
      <h2 style="color: #4CAF50; text-align: center;">🎉 Admin Account Verified Successfully!</h2>
      <p>Hi <strong>${email}</strong>,</p>
      <p>We are thrilled to inform you that your admin account has been successfully verified. You now have full access to all the features of the <strong>Dynamic Order Management System</strong>.</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://doms-front-end.vercel.app/" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: #fff; text-decoration: none; font-size: 16px; border-radius: 5px;">
          Login to Your Account
        </a>
      </div>
      <p>If you did not request this verification, please contact our support team immediately.</p>
      <hr style="border: 1px solid #ddd; margin: 20px 0;" />
      <p style="text-align: center; font-size: 14px; color: #888;">
        Best Regards, <br>
        <strong>Dynamic Order Management System Team</strong> <br>
        <a href="https://doms-front-end.vercel.app/" style="color: #555; text-decoration: none;">Visit Our Website</a>
      </p>
    </div>
  `,
      });

      console.log(`Email sent successfully to ${email}`);
      console.log("Email Info:", info);

      return res.status(200).json({
        success: true,
        message: "🫡 Your Admin Account is verified successfully",
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

const AdminChangePassword = async (req, res) => {
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
      console.warn("⚠️ Admin is not verified");
      return res
        .status(401)
        .json({ success: false, message: "❌ Your account is not verified." });
    }

    const existingAdmin = await admin
      .findOne({ _id: userId })
      .select("+password");

    if (!existingAdmin) {
      console.error("❌ Admin not found with userId:", userId);
      return res
        .status(404)
        .json({ success: false, message: "❌ Admin does not exist!" });
    }
    console.log(`✅ Admin found with userId: ${userId}`);

    const result = await doHashValidation(oldPassword, existingAdmin.password);
    if (!result) {
      console.warn("🪦 Invalid old password for userId:", userId);
      return res
        .status(401)
        .json({ success: false, message: "🪦 Invalid old password" });
    }
    console.log("✅ Old password is valid");

    const hashedPassword = await doHash(newPassword, 12);
    existingAdmin.password = hashedPassword;
    await existingAdmin.save();
    console.log(`✅ Password changed successfully for userId: ${userId}`);

    // Send Email Notification
    console.log("Preparing to send password change email...");
    const info = await transport.sendMail({
      from: "Dynamic Order Management System Made By YOG TANDEL",
      to: existingAdmin.email,
      subject: "🔐 Your Admin Password Has Been Changed Successfully",
      text: "Your admin password has been changed successfully. If this was not you, please contact support immediately.",
      html: /*HTML*/ `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color:rgb(134, 34, 210);">Password Change Successful</h2>
          <p>Hi <strong>${existingAdmin.email}</strong>,</p>
          <p>Your password has been changed successfully. If this was not you, please contact support immediately.</p>
          <hr style="border: 1px solid #ddd;" />
          <p>
            If you did not request this change, please reach out to our support team immediately.
          </p>
          <p style="margin-top: 20px;">Best Regards,<br><strong>Dynamic Order Management System Made Team</strong></p>
        </div>
      `,
    });

    console.log(`Email sent successfully to ${existingAdmin.email}`);
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

const AdminSendForgotPasswordCode = async (req, res) => {
  const { email } = req.body;

  try {
    console.log(
      `Received request to send verification code to email: ${email}`
    );

    // Checking if the Admin exists
    const existingAdmin = await admin.findOne({ email });
    if (!existingAdmin) {
      console.warn(
        `Send Code Attempt Failed: User not found with email: ${email}`
      );
      return res
        .status(404) // Not Found
        .json({ success: false, message: "❌ User does not exist!" });
    }

    // Generate the verification code
    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated verification code: ${codeValue}`);

    // Sending the verification code via email
    const info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingAdmin.email,
      subject: "➡️ Your Forgot Password Verification Code",
      html: /*HTML*/ `
        <div style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color:rgb(134, 34, 210); text-align: center;">Welcome to Dynamic Order Management System Made By YOG TANDEL!</h2>
        <p style="font-size: 16px;">Dear <strong>${
          existingAdmin.name || "Admin"
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

    console.log(`Verification email sent to: ${existingAdmin.email}`);
    console.log(
      `Email sent status: ${
        info.accepted[0] === existingAdmin.email ? "Success" : "Failed"
      }`
    );

    // If email is sent successfully, save the verification code and timestamp
    if (info.accepted[0] === existingAdmin.email) {
      const hashedCodeValue = await hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      console.log(`Hashed verification code: ${hashedCodeValue}`);

      existingAdmin.forgotPasswordCode = hashedCodeValue;
      existingAdmin.forgotPasswordCodeValidation = Date.now();
      console.log(`Saving verification code and timestamp for user: ${email}`);
      await existingAdmin.save();

      console.log(`Verification code successfully saved for user: ${email}`);
      return res
        .status(200)
        .json({ success: true, message: "✅ Forgot Password Code Sent" });
    }

    console.warn(`Failed to send email to user: ${email}`);
    return res
      .status(400)
      .json({ success: false, message: "❌ Code sent failed" });
  } catch (error) {
    console.error("❌ Error during sending Verification Code:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong during sending Verification Code",
    });
  }
};

const AdminVerifyForgotPasswordCode = async (req, res) => {
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
    const existingAdmin = await admin
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
    console.log("Stored Hash:", existingAdmin.forgotPasswordCode);
    console.log("Hashed Provided Code:", hashedProvidedCode);

    if (hashedProvidedCode === existingAdmin.forgotPasswordCode) {
      console.log(`✅ Verification successful for email: ${email}`);
      const hashedPassword = await doHash(newPassword, 12);
      existingAdmin.password = hashedPassword;
      existingAdmin.forgotPasswordCode = undefined;
      existingAdmin.forgotPasswordCodeValidation = undefined;

      console.log("💾 Saving user details...");
      await existingAdmin.save();

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

    console.log("🔍 Searching for all admins in the database...");

    const allAdmins = await admin.find().select("-password").lean();

    if (!allAdmins || allAdmins.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "❌ No admins found!" });
    }

    console.log(`👤 Found ${allAdmins.length} admins`);

    return res.status(200).json({
      success: true,
      message: "✅ Admin data retrieved successfully",
      data: allAdmins.map(
        ({ name, email, role, date, createdAt, updatedAt, enable }) => ({
          name,
          email,
          role,
          date,
          createdAt,
          updatedAt,
          enable, // ✅ Include `enable` field in response
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
  AdminSignup,
  AdminSignin,
  AdminSignout,
  AdminSendVerificationCode,
  AdminVerifyVerificationCode,
  AdminChangePassword,
  AdminSendForgotPasswordCode,
  AdminVerifyForgotPasswordCode,
  displayAllAdmins,
};
