const mongoose = require("mongoose");

const adminsSchema = new mongoose.Schema(
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

    date: {
      type: Date,
      default: Date.now,
    },

    isEnable: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      required: [true, "❌ Role must be provided!"],
      trim: true,
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

module.exports = mongoose.model("Admins", adminsSchema);