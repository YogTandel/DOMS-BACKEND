const express = require("express");
const adminController = require("../controllers/adminController.js");
const { identifier } = require("../Middlewares/identification.js");
const { isAuthenticated } = require("../Middlewares/auth.js");
const router = express.Router();

router.get("/admins", isAuthenticated, adminController.displayAllAdmins);
router.post("/signup", adminController.AdminSignup);
router.post("/signin", adminController.AdminSignin);
router.post("/signout", isAuthenticated, adminController.AdminSignout);

router.patch(
  "/sendVerificationCode",
  isAuthenticated,

  adminController.AdminSendVerificationCode
);
router.patch(
  "/verifyVerificationCode",
  isAuthenticated,

  adminController.AdminVerifyVerificationCode
);
router.patch(
  "/changepassword",
  isAuthenticated,
  adminController.AdminChangePassword
);
router.patch(
  "/sendforgotpasswordcode",
  adminController.AdminSendForgotPasswordCode
);
router.patch(
  "/verifyforgotpasswordcode",
  adminController.AdminVerifyForgotPasswordCode
);

module.exports = router;
