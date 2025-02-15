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
      type: [String], // Now an array of ingredients
      required: [true, "❌ Ingredients are required!"],
      trim: true,
    },

    cookInvolve: {
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
      default: false,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Menu", menuSchema);
