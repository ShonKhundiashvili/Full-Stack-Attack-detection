const express = require("express");
const router = express.Router();
const { verifyToken } = require("./auth");
const {
  login,
  register,
  forgotPassword,
  changePassword,
  searchInTable,
  activate,
  changeForgottenPassword,
  deleteAccount,
} = require("./service");

//Unprotected routes
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.post("/register", register);

//Protected routes
router.use(verifyToken);
router.post("/searchInTable", searchInTable);
router.post("/changeForgottenPassword", changeForgottenPassword);
router.get("/activate", activate);
router.post("/deleteAccount", deleteAccount);
router.post("/changePassword", changePassword);

module.exports = router;