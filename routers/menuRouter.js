const express = require("express");
const menuController = require("../controllers/menuController.js");
const router = express.Router();

router.post("/menues", menuController.createMenu);
router.get("/allmenues", menuController.getAllMenus);
router.put("/menues/:_id", menuController.updateMenu);
router.delete("/menues/:_id", menuController.deleteMenu);
router.get("/menues/:scheduledDays", menuController.getMenusByDay);

module.exports = router;
