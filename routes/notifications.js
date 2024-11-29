const express = require("express");
const router = express.Router();
//const upload = require("../middlewares/multerConfig"); // Adjust the path as needed

const notificationsController = require("../controllers/notificationsController");
let wss; // WebSocket server instance

// Function to set the WebSocket server
const setWebSocketServerNotification = (webSocketServer) => {
  wss = webSocketServer; // Assign the WebSocket server instance
};

const attachWebSocket = (req, res, next) => {
  req.wss = wss; // Attach the WebSocket server instance to the request
  next();
};

router.post(
  "/getnotifications",
  attachWebSocket, // Upload the files before the controller
  notificationsController.getnotifications // Call the controller to handle the chat message saving
);
router.post(
  "/getnotificationsdashboard",
  attachWebSocket, // Upload the files before the controller
  notificationsController.getnotificationsdashboard // Call the controller to handle the chat message saving
);
router.post(
  "/updatenotifications",
  notificationsController.updatenotifications // Call the controller to handle the chat message saving
);
module.exports = { router, setWebSocketServerNotification };
