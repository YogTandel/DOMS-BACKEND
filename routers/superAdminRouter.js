const express = require("express");
const superAdminController = require("../controllers/superAdminController.js");
const { identifier } = require("../Middlewares/identification.js");
const { isAuthenticated } = require("../Middlewares/auth.js");
const router = express.Router();

router.get("/superadmin", isAuthenticated, superAdminController.adminDisplay);
router.post("/signup", superAdminController.SuperAdminSignup);
router.post("/signin", superAdminController.SuperAdminSignin);
router.post(
  "/signout",
  isAuthenticated,
  superAdminController.SuperAdminSignout
);

router.patch(
  "/sendVerificationCode",
  isAuthenticated,
  superAdminController.SuperAdminSendVerificationCode
);
router.patch(
  "/verifyVerificationCode",
  isAuthenticated,
  superAdminController.superAdminverifyVerificationCode
);
router.patch(
  "/changepassword",
  isAuthenticated,
  superAdminController.superAdminchangePassword
);
router.patch(
  "/sendforgotpasswordcode",
  superAdminController.superAdminSendForgotPasswordCode
);
router.patch(
  "/verifyforgotpasswordcode",
  superAdminController.superAdminverifyForgotPasswordCode
);

module.exports = router;
