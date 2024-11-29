const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multerConfig"); // Adjust the path as needed
const profileController = require("../controllers/profileController");
let wss; // WebSocket server instance

// Function to set the WebSocket server
const setWebSocketServerProfile = (webSocketServer) => {
  wss = webSocketServer; // Assign the WebSocket server instance
};

const attachWebSocket = (req, res, next) => {
  req.wss = wss; // Attach the WebSocket server instance to the request
  next();
};
router.post("/getAllFriend", profileController.getAllFriend);
router.post("/getUsersFriendRequest", profileController.getUsersFriendRequest);
router.post("/AcceptRequest", attachWebSocket, profileController.AcceptRequest);

router.post("/getReceivedMessage", profileController.getReceivedMessage);
router.post("/getSendMessage", profileController.getSendMessage);
router.post("/getSendMessageSearch", profileController.getSendMessageSearch);
router.post(
  "/getReceivedMessageSearch",
  profileController.getReceivedMessageSearch
);
router.post("/getUserSlug", profileController.getUserSlug);
router.post("/getUsercheckPermisson", profileController.getUsercheckPermisson);

router.post("/setonline", profileController.setonline);
router.post("/setoffline", profileController.setoffline);
router.post("/gettotalOnline", profileController.gettotalOnline);
router.post("/gettotalImages", profileController.gettotalImages);
router.post("/gettotalGroups", profileController.gettotalGroups);
router.post("/gettotalEvents", profileController.gettotalEvents);
router.post("/getvisitprofile", profileController.getvisitprofile);
router.post(
  "/speeddateSave",
  upload.single("image"),
  profileController.speeddateSave
);
router.post("/getAlldates", profileController.getAlldates);
router.post("/getdates", profileController.getdates);
router.post("/getdatesSearch", profileController.getdatesSearch);
router.post("/getAlldatesSearch", profileController.getAlldatesSearch);
router.post("/getAllforum", profileController.getAllforum);
router.post("/getforum", profileController.getforum);
router.post("/getAllforumSearch", profileController.getAllforumSearch);
router.post("/getforumSearch", profileController.getforumSearch);
router.post("/get_ForumDetailSlug", profileController.get_ForumDetailSlug);
router.post("/getfforumComments", profileController.get_ForumComments);
router.post("/forumdelete", profileController.forumdelete);
router.post("/forumSave", upload.single("image"), profileController.forumSave);
//module.exports = router;
module.exports = { router, setWebSocketServerProfile };
