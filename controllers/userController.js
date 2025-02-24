require("dotenv").config();
const users = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET_KEY;
const validator = require("../Middlewares/userAuth.js");
const {
  doHash,
  doHashValidation,
  hmacProcess,
} = require("../utils/hashing.js");
const { transport } = require("../Middlewares/sendMail.js");

const UserSignup = async (req, res) => {
  let { userName, email, password, confirmPassword } = req.body;
  console.log("Request Body for User Signup", req.body);

  try {
    const role = "customer";
    console.log(`📌 Assigned Role: ${role}`);

    const { error, value } = validator.signupSchema.validate({
      userName,
      email,
      password,
      confirmPassword,
    });
    if (error) {
      console.log("User Signup Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    console.log("User Signup Validation Passed:", value);

    const existingUser = await users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("Signup Attempt: User Already Exists with Email:", email);
      return res
        .status(400)
        .json({ success: false, message: "❌ User Already Exists!" });
    }

    const token = jwt.sign({ userName, email }, SECRET_KEY, {
      expiresIn: "1h",
    });
    console.log("Generated Token:", token);

    const hashedPassword = await doHash(password, 12);
    console.log("Hashed Password for User Signup:", hashedPassword);

    const newUser = new users({
      userName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      verified: false,
    });

    const result = await newUser.save();
    console.log("New User Created:", result);

    console.log("Preparing to send email...");
    const info = await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "✅ Registration Successful",
      html: `<div style="font-family: Arial, sans-serif; color: #333; background: #f4f4f4; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #6c63ff;">✅ User Account Created</h2>
          <p>Hello <strong>${email}</strong>,</p>
          <p>Your Customer account has been successfully registered.</p>
          <p>You can now log in to the system using the following details:</p>
          <h3 style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; border: 2px dashed #6c63ff; color: #6c63ff;">Username: ${userName}</h3>
          <h3 style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; border: 2px dashed #6c63ff; color: #6c63ff;">Email: ${email}</h3>
          <p>Please change your password upon first login for security purposes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr style="border: 1px solid #ddd; margin-top: 20px;">
          <p style="font-size: 12px; color: #888;">Dynamic Order Management System</p>
        </div>`,
    });

    console.log(`Email sent successfully to ${email}`);
    console.log("Email Info:", info);

    res.status(200).json({
      success: true,
      message: "✅ Customer account created successfully.",
      token,
      result: {
        userName,
        email: result.email,
        role: result.role,
        date: result.date,
      },
    });
  } catch (error) {
    console.error("Error in User Signup:", error);
    res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const UserSigin = async (req, res) => {
  const { email, password } = req.body;
  console.log("Request Body for User Signin:", req.body);

  try {
    const { error, value } = validator.signinSchema.validate({
      email: email.toLowerCase(),
      password,
    });
    if (error) {
      console.error("User Signin Validation Error:", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    console.log("User Signin Validation Passed:", value);

    const existingUser = await users
      .findOne({
        email: email.toLowerCase(),
      })
      .select("+password");

    if (!existingUser) {
      console.warn("Signin Attempt: Customer not found with email:", email);
      return res
        .status(404)
        .json({ success: false, message: "❌ Customer does not exist!" });
    }
    console.log("User Found for Signin:", existingUser);

    const isPasswordValid = await doHashValidation(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      console.warn("Signin Attempt: Invalid password for email:", email);
      return res
        .status(401)
        .json({ success: false, message: "❌ Invalid credentials!" });
    }
    console.log("Password Validated for Signin:", email);

    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        role: "customer",
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );
    console.log("✅ JWT Token Generated for Admin Signin:", token);

    req.session.user = {
      id: existingUser._id,
      email: existingUser.email,
      role: "customer",
    };
    console.log("✅ Session Stored:", req.session.user);

    res.cookie("Authorization", token, {
      maxAge: 3600000,
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.json({
      success: true,
      message: "👍 Signin successful!",
      token,
      role: req.session.user?.role || "customer",
      session: req.session.user,
    });
  } catch (error) {
    console.error("❌ Error in Customer Signin:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const UserSignout = async (req, res) => {
  try {
    console.log("Request Cookies:", req.cookies);
    const sessionId = req.session.id; // Get session ID before destroying

    req.session.destroy(async (err) => {
      if (err) {
        console.error("❌ Error during Customer signout:", err);
        return res.status(500).json({
          success: false,
          message: "❌ Error during Customer signout",
        });
      }

      // Manually remove session from MongoDB
      if (req.sessionStore) {
        req.sessionStore.destroy(sessionId, (err) => {
          if (err) {
            console.error("❌ Error removing session from store:", err);
          } else {
            console.log("✅ Session removed from database.");
          }
        });
      }

      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      });

      console.log("✅ Customer logged out successfully.");
      return res.status(200).json({
        success: true,
        message: "✅ Customer logged out successfully",
      });
    });
  } catch (error) {
    console.error("❌ Error during Customer signout:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong during Customer signout",
    });
  }
};

const UserSendVerificationCode = async (req, res) => {
  const { email } = req.body;
  console.log("🔍 Received Customer Email for Verification Code:", email);

  try {
    const existingUser = await users.findOne({ email: email.toLowerCase() });
    if (!existingUser) {
      console.warn("❌ Customer Not Found for Email:", email);
      return res
        .status(404)
        .json({ success: false, message: "❌ Customer does not exist!" });
    }

    if (existingUser.verified) {
      console.log(`🫡 Customer with email ${email} is already verified.`);
      return res.status(400).json({
        success: true,
        message: "✅ Customer is already verified",
      });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    console.log(`Generated verification code: ${verificationCode}`);

    const hashedCode = await hmacProcess(
      verificationCode,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    console.log(`Hashed verification code: ${hashedCode}`);

    existingUser.verificationCode = hashedCode;
    existingUser.verificationCodeValidation = Date.now() + 10 * 60 * 1000;
    await existingUser.save();

    const emailHTML = /*HTML*/ `
      <div style="font-family: Arial, sans-serif; color: #333; background: #f4f4f4; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #6c63ff;">🔐 Customer Verification Code</h2>
        <p>Hello <strong>${email}</strong>,</p>
        <p>Your verification code is:</p>
        <h1 style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; border: 2px dashed #6c63ff; color: #6c63ff;">${verificationCode}</h1>
        <p>This code will expire in <strong>10 minutes</strong>. Please do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: 1px solid #ddd; margin-top: 20px;">
        <p style="font-size: 12px; color: #888;">Dynamic Order Management System</p>
      </div>
    `;

    const info = await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "🔐 Your Verification Code",
      html: emailHTML,
    });

    console.log(`Verification Email sent successfully to ${email}`);
    console.log("Verification Email Info:", info);
    return res.status(200).json({
      success: true,
      message: "✅ Verification Code sent successfully",
    });
  } catch (error) {
    console.error("❌ Error in Customer Send VerificationCode:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong, please try again later",
    });
  }
};

const UserVerifyVerificationCode = async (req, res) => {
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
    const existingUser = await users
      .findOne({ email })
      .select("+verificationCode +verificationCodeValidation");

    if (!existingUser) {
      console.warn(`⚠️ Customer not found for email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "❌ Customer does not exist!" });
    }

    console.log("👤 Customer found:", { email });
    if (existingUser.verified) {
      console.log(`✅ Customer with email ${email} is already verified.`);
      return res
        .status(400)
        .json({ success: true, message: "✅ You Are Already Verified" });
    }

    if (
      !existingUser.verificationCode ||
      !existingUser.verificationCodeValidation
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
    if (hashedProvidedCode !== existingUser.verificationCode) {
      console.error(`❌ Verification failed for email: ${email}`);
      return res
        .status(400)
        .json({ success: false, message: "❌ Incorrect verification code." });
    }

    console.log(`✅ Verification successful for email: ${email}`);
    existingUser.verified = true;
    existingUser.verificationCode = undefined;
    existingUser.verificationCodeValidation = undefined;

    console.log("💾 Saving customer details...");
    await existingUser.save();

    console.log(
      `🎉 Customer account verified successfully for email: ${email}`
    );

    console.log("Preparing to send verification success email...");
    await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: email,
      subject: "✅ Your Customer Account Has Been Verified Successfully",
      html: /*HTML*/ `
      <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4CAF50; text-align: center;">🎉 Customer Account Verified Successfully!</h2>
          <p>Hi <strong>${email}</strong>,</p>
          <p>Your Customer account has been successfully verified. You now have full access to the <strong>Dynamic Order Management System</strong>.</p>
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
      message: "🫡 Your Customer Account is verified successfully",
    });
  } catch (error) {
    console.error("❌ Error during verifying Verification Code:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong during verification.",
    });
  }
};

const UserChangePassword = async (req, res) => {
  const { userId } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    console.log("🔐 Starting password change for userId:", userId);
    console.log("🔍 User Data from Token:", req.user);

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

    const existingUser = await users
      .findOne({ _id: userId })
      .select("+password +verified");
    if (!existingUser) {
      console.error("❌ Customer not found with userId:", userId);
      return res
        .status(404)
        .json({ success: false, message: "❌ Customer does not exist!" });
    }
    console.log(`✅ Customer found with userId: ${userId}`);

    if (!existingUser.verified) {
      console.warn("⚠️ Constumer is not verified");
      return res
        .status(401)
        .json({ success: false, message: "❌ Your account is not verified." });
    }

    const result = await doHashValidation(oldPassword, existingUser.password);
    if (!result) {
      console.warn("🪦 Invalid old password for userId:", userId);
      return res
        .status(401)
        .json({ success: false, message: "🪦 Invalid old password" });
    }
    console.log("✅ Old password is valid");

    const hashedPassword = await doHash(newPassword, 12);
    existingUser.password = hashedPassword;
    await existingUser.save();
    console.log(`✅ Password changed successfully for userId: ${userId}`);

    console.log("📧 Preparing to send password change confirmation email...");
    await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: existingUser.email,
      subject: "🔐 Your Customer Password Has Been Changed Successfully",
      html: /*HTML*/ `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color: rgb(134, 34, 210); text-align: center;">🔐 Password Change Successful</h2>
          <p>Hi <strong>${existingUser.email}</strong>,</p>
          <p>Your password has been changed successfully. If this was not you, please contact support immediately.</p>
          <hr style="border: 1px solid #ddd;" />
          <p>If you did not request this change, please reach out to our support team immediately.</p>
          <p style="text-align: center; font-size: 14px; color: #888;">Best Regards,<br><strong>Dynamic Order Management System Team</strong></p>
        </div>
      `,
    });

    console.log(`📧 Email sent successfully to ${existingUser.email}`);

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

const UserSendForgotPasswordCode = async (req, res) => {
  const { email } = req.body;

  try {
    console.log(
      `📩 Received request to send forgot password code to: ${email}`
    );

    const existingUser = await users.findOne({ email });
    if (!existingUser) {
      console.warn(
        `⚠️ Send Code Attempt Failed: Customer not found for email: ${email}`
      );
      return res
        .status(404)
        .json({ success: false, message: "❌ Customer does not exist!" });
    }

    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔢 Generated verification code: ${codeValue}`);

    const hashedCodeValue = await hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );
    console.log(`🔒 Hashed verification code stored for security.`);

    existingUser.forgotPasswordCode = hashedCodeValue;
    existingUser.forgotPasswordCodeValidation = Date.now();
    await existingUser.save();
    console.log(`📝 Verification code saved for user: ${existingUser.email}`);

    const info = await transport.sendMail({
      from: `"Dynamic Order Management System" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
      to: existingUser.email,
      subject: "🔑 Reset Your Password - Verification Code",
      html: /*HTML*/ `
        <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);">
          <h2 style="color:rgb(134, 34, 210); text-align: center;">🔑 Password Reset Request</h2>
          <p>Hi <strong>${existingUser.userName || "Customer"}</strong>,</p>
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

    if (info.accepted.includes(existingUser.email)) {
      console.log(
        `📧 Verification email sent successfully to: ${existingUser.email}`
      );
      return res
        .status(200)
        .json({ success: true, message: "✅ Forgot Password Code Sent" });
    }

    console.warn(`⚠️ Email sending failed for Customer: ${email}`);
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

const UsersVerifyForgotPasswordCode = async (req, res) => {
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
    const existingUser = await users
      .findOne({ email })
      .select("+forgotPasswordCode +forgotPasswordCodeValidation");

    if (!existingUser) {
      console.warn(`⚠️ Customer not found for email: ${email}`);
      return res
        .status(404)
        .json({ success: false, message: "❌ Customer does not exist!" });
    }

    console.log("👤 Customer found:", { email });

    if (
      !existingUser.forgotPasswordCode ||
      !existingUser.forgotPasswordCodeValidation
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
    if (hashedProvidedCode !== existingUser.forgotPasswordCode) {
      console.error(`❌ Incorrect verification code for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: "❌ Incorrect verification code. Please try again.",
      });
    }

    console.log(`✅ Verification successful for email: ${email}`);

    const hashedPassword = await doHash(newPassword, 12);
    existingUser.password = hashedPassword;
    existingUser.forgotPasswordCode = undefined;
    existingUser.forgotPasswordCodeValidation = undefined;

    console.log("💾 Saving new password...");
    await existingUser.save();

    console.log(
      `🎉 Password has been updated successfully for email: ${email}`
    );

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

const displayAllCustomer = async (req, res) => {
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
      `🔐 Authorized Customer: ${req.user.email} (Role: ${req.user.role})`
    );

    console.log("🔍 Fetching all Customers from the database...");

    const allCustomers = await users.find().select("-password").lean();

    if (!allCustomers || allCustomers.length === 0) {
      console.warn("⚠️ No Customers found in the database.");
      return res.status(404).json({
        success: false,
        message: "❌ No Customers found!",
      });
    }

    console.log(`👤 Found ${allCustomers.length} Customers`);

    return res.status(200).json({
      success: true,
      message: "✅ Customers data retrieved successfully",
      totalCustomers: allCustomers.length,
      data: allCustomers.map(
        ({ _id, name, email, role, date, createdAt, updatedAt }) => ({
          id: _id, // ✅ Include unique ID
          name,
          email,
          role,
          date,
          createdAt,
          updatedAt,
        })
      ),
    });
  } catch (error) {
    console.error("❌ Error retrieving customer data:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Something went wrong while retrieving customer data",
    });
  }
};

module.exports = {
  UserSignup,
  UserSigin,
  UserSignout,
  UserSendVerificationCode,
  UserVerifyVerificationCode,
  UserChangePassword,
  UserSendForgotPasswordCode,
  UsersVerifyForgotPasswordCode,
  displayAllCustomer,
};
