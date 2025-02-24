const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "❌ Usename is required"],
      unique: true,
      trim: true,
    },

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

    date: {
      type: Date,
      default: Date.now,
    },

    role: {
      type: String,
      default: "customer",
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", userSchema);
