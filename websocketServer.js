// websocketServer.js
const WebSocket = require("ws");
const eventsController = require("./controllers/eventsController"); // Adjust the path as necessary

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", async (message) => {
      const data = JSON.parse(message);
      const { postId, userId, eventId, comment } = data;

      // Save comment to the database
      await eventsController.CreateEventPostComment({
        body: { event_id: eventId, user_id: userId, comment, post_id: postId },
      });

      // Broadcast the comment only to the intended recipient
      wss.clients.forEach(async (client) => {
        if (client.readyState === WebSocket.OPEN) {
          const clientsUserId = client.userId; // Set userId on the client connection
          if (clientsUserId === userId) {
            // Only send to the intended user
            const commentsData = await eventsController.get_postComment({
              body: { event_id: eventId, user_id: clientsUserId },
            });
            client.send(JSON.stringify(commentsData));
          }
        }
      });
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

module.exports = setupWebSocketServer;
