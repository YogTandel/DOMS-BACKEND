const express = require("express");
const adminsController = require("../controllers/adminsController.js");
const { isAuthenticated } = require("../Middlewares/auth.js");
const router = express.Router();

router.get("/admins", isAuthenticated, adminsController.displayAllAdmins);
router.post("/signup", adminsController.AdminsSignup);
router.post("/signin", adminsController.AdminsSignin);
router.post("/signout", isAuthenticated, adminsController.AdminsSignout);

router.patch(
  "/sendVerificationCode",
  isAuthenticated,
  adminsController.AdminsSendVerificationCode
);
router.patch(
  "/verifyVerificationCode",
  isAuthenticated,
  adminsController.AdminsVerifyVerificationCode
);
router.patch(
  "/changepassword",
  isAuthenticated,
  adminsController.AdminsChangePassword
);
router.patch(
  "/sendforgotpasswordcode",
  adminsController.AdminsSendForgotPasswordCode
);
router.patch(
  "/verifyforgotpasswordcode",
  adminsController.AdminsVerifyForgotPasswordCode
);

module.exports = router;
