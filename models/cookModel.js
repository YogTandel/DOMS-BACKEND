const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Present", "Absent"],
    required: true,
  },
});

const cookSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "❌ Name is required!"],
      trim: true,
      unique: true,
      minLength: [3, "❌ Name must have at least 5 characters!"],
      maxLength: [50, "❌ Name must have at most 50 characters!"],
    },

    address: {
      type: String,
      required: [true, "❌ Address is required!"],
      trim: true,
      minLength: [5, "❌ Address must have at least 10 characters!"],
    },

    mobileNumber: {
      type: String,
      required: [true, "❌ Mobile number is required!"],
      unique: true,
      match: [/^\d{10}$/, "❌ Mobile number must be a 10-digit number!"],
    },

    attendance: [attendanceSchema],

    role: {
      type: String,
      default: "cook",
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Cook", cookSchema);
