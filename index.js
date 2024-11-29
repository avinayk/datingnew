const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const loginRoutes = require("./routes/login");
const registerRoutes = require("./routes/register");
const usersRoutes = require("./routes/users");

const {
  router: profileRoutes,

  setWebSocketServerProfile,
} = require("./routes/profile");
const {
  router: membersRouter,

  setWebSocketServer,
} = require("./routes/members");
const {
  router: groupsRouter,
  setWebSocketServerGroup,
} = require("./routes/groups");
const {
  router: eventsRoutes,
  setWebSocketServerEvent,
} = require("./routes/events");
const {
  router: notificationsRoutes,
  setWebSocketServerNotification,
} = require("./routes/notifications");

//Admin
const adminloginRoutes = require("./routes/admin");
//Admin
dotenv.config();

const app = express();
const server = http.createServer(app); // Create an HTTP server
const WebSocket = require("ws");

const wss = new WebSocket.Server({ server }); // Create a WebSocket server

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/login", loginRoutes);
app.use("/api", registerRoutes);

app.use("/api", eventsRoutes);
app.use("/api/user/", usersRoutes);
app.use("/api/profile/", profileRoutes);
app.use("/api/members/", membersRouter);
app.use("/api/groups/", groupsRouter);
app.use("/api/notifications/", notificationsRoutes);

//Admin
app.use("/api/admin/", adminloginRoutes);
//Admin
// Set the WebSocket server for members routes
setWebSocketServer(wss); // Pass the WebSocket server instance
setWebSocketServerGroup(wss); // Pass the WebSocket server instance
setWebSocketServerEvent(wss);
setWebSocketServerNotification(wss);
setWebSocketServerProfile(wss);
// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("index client connected");

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
