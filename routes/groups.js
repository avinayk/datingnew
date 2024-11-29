const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multerConfig"); // Adjust the path as needed
const groupsController = require("../controllers/groupsController");

let wss; // WebSocket server instance

// Function to set the WebSocket server
const setWebSocketServerGroup = (webSocketServer) => {
  wss = webSocketServer; // Assign the WebSocket server instance
};

const attachWebSocket = (req, res, next) => {
  req.wss = wss; // Attach the WebSocket server instance to the request
  next();
};

// Define the POST routes

router.post("/getgroup", groupsController.getgroup);
router.post("/groupsave", upload.single("image"), groupsController.groupsave);
router.post("/getGroupDetailSlug", groupsController.getGroupDetailSlug);
router.post("/userDeleteGroup", groupsController.userDeleteGroup);
router.post("/getallYourgroupsUser", groupsController.getallYourgroupsUser);
router.post("/sendGroupinvite", groupsController.sendGroupinvite);
router.post("/UsercheckAccept", groupsController.UsercheckAccept);
router.post(
  "/getGroupdetailAllIntersted",
  groupsController.getGroupdetailAllIntersted
);
router.post("/get__groupDetailSetId ", groupsController.get__groupDetailSetId);

router.post("/getAllgroup", groupsController.getAllgroup);
router.post("/DeleteInviteRequest", groupsController.DeleteInviteRequest);
router.post("/userGroupIntersted", groupsController.userGroupIntersted);
router.post("/groupAccepted", attachWebSocket, groupsController.groupAccepted);

router.post(
  "/createGroupPost",
  upload.single("image"),
  groupsController.createGroupPost
);
router.post("/get_postComment", groupsController.get_postComment);
router.post(
  "/GrouppostFavourite",
  attachWebSocket,
  groupsController.GrouppostFavourite
);
router.post(
  "/CreateGroupPostComment",
  attachWebSocket,
  groupsController.CreateGroupPostComment
);
router.post("/get_AllMygroup", groupsController.get_AllMygroup);
router.post("/getmostpopularGroups", groupsController.getmostpopularGroups);

router.post("/getgroupSearch", groupsController.getgroupSearch);
router.post("/getgroup_s", groupsController.getgroup_s);
router.post("/getgroupdiscover", groupsController.getgroupdiscover);
router.post("/get_userGroupIntersted", groupsController.get_userGroupIntersted);
// Export the router and the setWebSocketServer function
module.exports = { router, setWebSocketServerGroup };
