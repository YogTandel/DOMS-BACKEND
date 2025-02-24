const express = require("express");
const router = express.Router();
const cookController = require("../controllers/cookController.js");

router.post("/createcook", cookController.createCook);
router.get("/getAllCooks", cookController.getAllCooks);
router.get("/:_id", cookController.getCookById);
router.get("/name/:name", cookController.getCookIdByName);
router.put("/:_id", cookController.updateCook);
router.delete("/:_id", cookController.deleteCook);

// Attendance Routes
router.post("/:_id/attendance", cookController.markAttendance);
router.get("/:_id/attendance", cookController.getAttendance);

module.exports = router;
