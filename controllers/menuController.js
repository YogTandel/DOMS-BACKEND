const Menu = require("../models/menuModel.js");

const createMenu = async (req, res) => {
  try {
    console.log("🔄 Creating Menu with data:", req.body);
    const menu = new Menu(req.body);
    await menu.save();
    console.log("✅ Menu Created:", menu);
    res.status(201).json({
      status: "success",
      message: "✅ Menu Created Successfully",
      data: { menu },
    });
  } catch (error) {
    console.error("❌ Error Creating Menu:", error.message);
    res.status(400).json({
      status: "fail",
      message: "❌ Failed to Create Menu",
      error: error.message,
    });
  }
};

const getAllMenus = async (req, res) => {
  try {
    console.log("🔄 Fetching All Menus...");
    const menus = await Menu.find();
    console.log("✅ Menus Fetched:", menus.length, "menus found");
    res.status(200).json({
      status: "success",
      data: { menus },
    });
  } catch (error) {
    console.error("❌ Error Fetching Menus:", error.message);
    res.status(400).json({
      status: "fail",
      message: "❌ Failed to Fetch Menus",
      error: error.message,
    });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { _id } = req.params;
    console.log("🔄 Updating Menu ID:", _id, "with data:", req.body);
    const updatedMenu = await Menu.findByIdAndUpdate(_id, req.body, {
      new: true,
    });
    console.log("✅ Menu Updated:", updatedMenu);
    res.status(200).json({
      status: "success",
      message: "✅ Menu Updated Successfully",
      data: { updatedMenu },
    });
  } catch (error) {
    console.error("❌ Error Updating Menu:", error.message);
    res.status(400).json({
      status: "fail",
      message: "❌ Failed to Update Menu",
      error: error.message,
    });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { _id } = req.params;
    console.log("🔄 Deleting Menu ID:", _id);
    await Menu.findByIdAndDelete(_id);
    console.log("✅ Menu Deleted Successfully");
    res.status(200).json({
      status: "success",
      message: "✅ Menu Deleted Successfully",
    });
  } catch (error) {
    console.error("❌ Error Deleting Menu:", error.message);
    res.status(400).json({
      status: "fail",
      message: "❌ Failed to Delete Menu",
      error: error.message,
    });
  }
};

const getMenusByDay = async (req, res) => {
  try {
    const { scheduledDays } = req.params;
    console.log("🔄 Fetching Menus for Day:", scheduledDays);
    const menus = await Menu.find({ scheduledDays });
    console.log(`✅ ${menus.length} Menus Found for ${scheduledDays}`);
    res.status(200).json({
      status: "success",
      data: { menus },
    });
  } catch (error) {
    console.error("❌ Error Fetching Menus for Day:", error.message);
    res.status(400).json({
      status: "fail",
      message: "❌ Failed to Fetch Menus",
      error: error.message,
    });
  }
};

module.exports = {
  createMenu,
  getAllMenus,
  updateMenu,
  deleteMenu,
  getMenusByDay,
};
