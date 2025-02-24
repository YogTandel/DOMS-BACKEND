const express = require("express");
const userController = require("../controllers/userController.js");
const { isAuthenticated } = require("../Middlewares/auth.js");
const router = express.Router();

router.get("/customers", isAuthenticated, userController.displayAllCustomer);
router.post("/register", userController.UserSignup);
router.post("/login", userController.UserSigin);
router.post("/logout", isAuthenticated, userController.UserSignout);

router.patch(
  "/sendVerificationCode",
  isAuthenticated,
  userController.UserSendVerificationCode
);
router.patch(
  "/verifyVerificationCode",
  isAuthenticated,
  userController.UserVerifyVerificationCode
);
router.patch(
  "/changepassword",
  isAuthenticated,
  userController.UserChangePassword
);

router.patch(
  "/sendforgotpasswordcode",
  userController.UserSendForgotPasswordCode
);
router.patch(
  "/verifyforgotpasswordcode",
  userController.UsersVerifyForgotPasswordCode
);
module.exports = router;
