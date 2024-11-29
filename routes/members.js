const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multerConfig"); // Adjust the path as needed
const membersController = require("../controllers/membersController");

let wss; // WebSocket server instance

// Function to set the WebSocket server
const setWebSocketServer = (webSocketServer) => {
    wss = webSocketServer; // Assign the WebSocket server instance
};

const attachWebSocket = (req, res, next) => {
    req.wss = wss; // Attach the WebSocket server instance to the request
    next();
};

// Define the POST routes
router.post("/getAllMembers", membersController.getAllMembers);
router.post("/getUserDetailMember", membersController.getUserDetailMember);
router.post("/getEvent_s", membersController.getEvent_s);
router.post("/getAllfriend_s", membersController.getAllfriend_s);
router.post("/getCheck_friend", membersController.getCheck_friend);
router.post("/getCheck_friendUser", membersController.getCheck_friendUser);
router.post("/sendFriendRequest", membersController.sendFriendRequest);
router.post("/getuserChatmessage", membersController.getuserChatmessage);
router.post("/getSEndMessage", membersController.getSEndMessage);
router.post("/getAllgallery", membersController.getAllgallery);
router.post("/getgallery", membersController.getgallery);
router.post(
    "/saveUserChat",
    upload.array("files"),
    attachWebSocket,
    membersController.saveUserChat
);
router.post(
    "/gallerysave",
    upload.single("image"),
    attachWebSocket, // Upload the files before the controller

    membersController.gallerysave // Call the controller to handle the chat message saving
);
router.post("/getGalleryDetail", membersController.getGalleryDetail);
router.post("/getUserDetail", membersController.getUserDetail);
router.post(
    "/galleryPostLike",
    attachWebSocket,
    membersController.galleryPostLike
);
router.post("/getGalleryComments", membersController.getGalleryComments);
router.post("/getAllfriends", membersController.getAllfriends);
router.post("/getgallerySearch", membersController.getgallerySearch);
router.post("/getAllgallerySearch", membersController.getAllgallerySearch);
router.post(
    "/GalleryPostSave",
    attachWebSocket, // Attach WebSocket middleware
    membersController.GalleryPostSave
);
router.post(
    "/requestToview",
    attachWebSocket, // Attach WebSocket middleware
    membersController.requestToview
);
router.post(
    "/Requestdelete",
    attachWebSocket, // Attach WebSocket middleware
    membersController.Requestdelete
);
router.post(
    "/RequestConfirm",
    attachWebSocket, // Attach WebSocket middleware
    membersController.RequestConfirm
);
router.post(
    "/forumscommentSave",
    attachWebSocket, // Attach WebSocket middleware
    membersController.forumscommentSave
);

router.post("/visitprofile", membersController.visitprofile);
router.post("/getcheckfriendss", membersController.getcheckfriendss);
router.post("/getdashboardpost", membersController.getdashboardpost);
router.post("/messageseen", attachWebSocket, membersController.messageseen);
router.post("/searchfilter", attachWebSocket, membersController.searchfilter);
router.post("/membersearch", membersController.membersearch);
router.post("/areafilter", membersController.areafilter);
router.post("/agefilter", membersController.agefilter);
router.post("/sexfilter", membersController.sexfilter);
router.post("/checkmembership", membersController.checkmembership);
router.post("/userblock", membersController.userblock);
router.post("/getcheckuserblock", membersController.getcheckuserblock);
router.post("/getcheckuserblockend", membersController.getcheckuserblockend);
router.post("/userunblock", membersController.userunblock);
router.post("/checkuserblock", membersController.checkuserblock);
router.post("/create_payment_intent", membersController.create_payment_intent);
router.post("/galleryfilter", membersController.galleryfilter);
router.post("/getonlineuser",attachWebSocket, membersController.getonlineuser);
router.post("/useractivity",attachWebSocket, membersController.useractivity);


// Export the router and the setWebSocketServer function
module.exports = { router, setWebSocketServer };