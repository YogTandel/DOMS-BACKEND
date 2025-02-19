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

const holidayMenus = async (req, res) => {
  try {
    // Example holiday menus data
    const holidayMenusData = [
      {
        holidayName: "Christmas",
        date: "2025-12-25",
        menus: [
          {
            _id: "67b359640ff20e884955fdd4",
            title: "Roast Turkey",
            price: 25.99,
          },
          { _id: "67b359eb0ff20e884955fddc", title: "Eggnog", price: 8.99 },
        ],
      },
      {
        holidayName: "New Year's Eve",
        date: "2025-12-31",
        menus: [
          { _id: "67b35bda0ff20e884955fdf5", title: "Champagne", price: 15.99 },
          {
            _id: "67b359eb0ff20e884955fddc",
            title: "Party Snacks",
            price: 12.99,
          },
        ],
      },
    ];

    // Simulate async operation (for example, fetching from a DB)
    // You can replace this with a real database call.
    // await someDatabaseCall();

    res.json({
      status: "success",
      data: { holidays: holidayMenusData },
    });
  } catch (error) {
    console.error("Error fetching holiday menus:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch holiday menus",
    });
  }
};

module.exports = {
  createMenu,
  getAllMenus,
  updateMenu,
  deleteMenu,
  getMenusByDay,
  holidayMenus,
};
