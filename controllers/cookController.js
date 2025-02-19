const Cook = require("../models/cookModel.js");

const createCook = async (req, res) => {
  try {
    const { name, address, mobileNumber } = req.body;
    console.log("🟢 [CREATE] Request received:", req.body);

    // Check if cook already exists
    const existingCook = await Cook.findOne({ mobileNumber });
    if (existingCook) {
      console.log("🔴 Cook already exists with this mobile number.");
      return res.status(400).json({
        status: "error",
        message: "❌ Cook with this mobile number already exists!",
      });
    }

    const newCook = new Cook({ name, address, mobileNumber });
    await newCook.save();
    console.log("✅ New cook added:", newCook);

    res.status(201).json({
      status: "success",
      message: "✅ Cook added successfully!",
      data: newCook,
    });
  } catch (error) {
    console.error("❌ [CREATE] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getAllCooks = async (req, res) => {
  try {
    console.log("🟢 [GET ALL] Fetching all cooks...");
    const cooks = await Cook.find();
    console.log("✅ Cooks fetched:", cooks.length);

    res.status(200).json({ status: "success", data: cooks });
  } catch (error) {
    console.error("❌ [GET ALL] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getCookById = async (req, res) => {
  try {
    console.log(`🟢 [GET] Fetching cook with ID: ${req.params._id}`);
    const cook = await Cook.findById(req.params._id);

    if (!cook) {
      console.log("🔴 Cook not found!");
      return res
        .status(404)
        .json({ status: "error", message: "❌ Cook not found!" });
    }

    console.log("✅ Cook found:", cook);
    res.status(200).json({ status: "success", data: cook });
  } catch (error) {
    console.error("❌ [GET] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const updateCook = async (req, res) => {
  try {
    console.log(
      `🟢 [UPDATE] Updating cook with ID: ${req.params._id}`,
      req.body
    );
    const { name, address, mobileNumber } = req.body;

    const updatedCook = await Cook.findByIdAndUpdate(
      req.params._id,
      { name, address, mobileNumber },
      { new: true, runValidators: true }
    );

    if (!updatedCook) {
      console.log("🔴 Cook not found for update!");
      return res
        .status(404)
        .json({ status: "error", message: "❌ Cook not found!" });
    }

    console.log("✅ Cook updated successfully:", updatedCook);
    res.status(200).json({
      status: "success",
      message: "✅ Cook updated successfully!",
      data: updatedCook,
    });
  } catch (error) {
    console.error("❌ [UPDATE] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const deleteCook = async (req, res) => {
  try {
    console.log(`🟢 [DELETE] Deleting cook with ID: ${req.params._id}`);
    const deletedCook = await Cook.findByIdAndDelete(req.params._id);

    if (!deletedCook) {
      console.log("🔴 Cook not found for deletion!");
      return res
        .status(404)
        .json({ status: "error", message: "❌ Cook not found!" });
    }

    console.log("✅ Cook deleted successfully!");
    res
      .status(200)
      .json({ status: "success", message: "✅ Cook deleted successfully!" });
  } catch (error) {
    console.error("❌ [DELETE] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const markAttendance = async (req, res) => {
  try {
    console.log(
      `🟢 [ATTENDANCE] Marking attendance for cook ID: ${req.params._id}`,
      req.body
    );

    const { status } = req.body;
    const today = new Date().toISOString().split("T")[0]; // Get current date (YYYY-MM-DD)

    const cook = await Cook.findById(req.params._id);
    if (!cook) {
      console.log("🔴 Cook not found for attendance!");
      return res
        .status(404)
        .json({ status: "error", message: "❌ Cook not found!" });
    }

    // Check if attendance is already marked for today
    const alreadyMarked = cook.attendance.some(
      (record) => record.date.toISOString().split("T")[0] === today
    );

    if (alreadyMarked) {
      return res.status(400).json({
        status: "error",
        message: "⚠️ Attendance already marked for today!",
      });
    }

    // Mark attendance if not already marked
    cook.attendance.push({ date: new Date(), status });
    await cook.save();

    console.log("✅ Attendance marked:", cook.attendance);
    res.status(200).json({
      status: "success",
      message: "✅ Attendance marked successfully!",
      data: cook,
    });
  } catch (error) {
    console.error("❌ [ATTENDANCE] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getAttendance = async (req, res) => {
  try {
    console.log(
      `🟢 [GET ATTENDANCE] Fetching attendance for cook ID: ${req.params._id}`
    );
    const cook = await Cook.findById(req.params._id);

    if (!cook) {
      console.log("🔴 Cook not found for attendance!");
      return res
        .status(404)
        .json({ status: "error", message: "❌ Cook not found!" });
    }

    console.log("✅ Attendance fetched:", cook.attendance.length);
    res.status(200).json({ status: "success", data: cook.attendance });
  } catch (error) {
    console.error("❌ [GET ATTENDANCE] Error:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  createCook,
  getAllCooks,
  getCookById,
  updateCook,
  deleteCook,
  markAttendance,
  getAttendance,
};
