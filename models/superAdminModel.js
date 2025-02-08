const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "❌ Email is required!"],
      trim: true,
      unique: true,
      minLength: [5, "❌ Email must have at least 5 characters!"],
      match: [/.+@.+\..+/, "❌ Please enter a valid email address!"],
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, "❌ Password must be provided!"],
      trim: true,
      select: false,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verificationCode: {
      type: String,
      select: false,
    },

    verificationCodeValidation: {
      type: Number,
      select: false,
    },

    forgotPasswordCode: {
      type: String,
      select: false,
    },

    forgotPasswordCodeValidation: {
      type: Number,
      select: false,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    enable: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "superadmin",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
