const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "❌ Title is required!"],
      trim: true,
      unique: true,
      minLength: [5, "❌ Title must have at least 5 characters!"],
      maxLength: [50, "❌ Title must have at most 50 characters!"],
    },

    price: {
      type: Number,
      required: [true, "❌ Price is required!"],
      min: [0, "❌ Price must be a positive number!"],
    },

    ingredients: {
      type: [String],
      required: [true, "❌ Ingredients are required!"],
      trim: true,
    },

    scheduledDays: {
      type: [String],
      required: [true, "❌ Scheduled days are required!"],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },

    cookInvolve: {
      type: String,
      required: [true, "❌ Cook involve is required!"],
    },

    optionalCookInvolve: {
      type: String,
    },

    flavourType: {
      type: String,
      required: [true, "❌ Cooking type is required!"],
      enum: ["Hot", "Spicy", "Medium"],
    },

    menuType: {
      type: String,
      required: [true, "❌ Menu type is required!"],
      enum: ["Starter", "MainCourse", "Dessert"],
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Menu", menuSchema);
