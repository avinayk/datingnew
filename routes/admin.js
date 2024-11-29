const express = require("express");
const router = express.Router();
const loginController = require("../controllers/admin/loginController");

const userController = require("../controllers/admin/userController");
// Define the POST /login route
router.post("/login", loginController.login);

router.post("/getallusers", userController.getallusers);
router.post("/deleteusers", userController.deleteusers);
router.post("/editprofile", userController.editprofile);
router.post("/getallmedia", userController.getallmedia);
router.post("/deletemedia", userController.deletemedia);
router.post("/getallgroups", userController.getallgroups);
router.post("/deletegroup", userController.deletegroup);
router.post("/getallforum", userController.getallforum);
router.post("/deleteforum", userController.deleteforum);
router.post("/getallmessaging", userController.getallmessaging);
router.post("/deletemessage", userController.deletemessage);

module.exports = router;
