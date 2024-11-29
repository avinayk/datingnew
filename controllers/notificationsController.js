const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const WebSocket = require("ws");
const slugify = require("slugify");
const moment = require("moment-timezone");
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use((req, res, next) => {
  req.wss = wss;
  next();
});

// Broadcast function to send messages to all connected clients
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};
//console.log(wss);
// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New client connected");
  ws.send(JSON.stringify({ message: "Welcome to the WebSocket server!" }));

  ws.on("message", (message) => {
    // Handle incoming messages and broadcast them
    console.log(`Received message: ${message}`);
    broadcast(message);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
exports.getnotifications = async (req, res) => {
  const { user_id, user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.profile_image,u.profile_type, u.gender
      FROM notification g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ${user_id}  -- Use IN clause to filter by multiple user IDs
      ORDER BY g.id DESC;
    `;
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getnotificationsdashboard = async (req, res) => {
  const { user_id, user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.profile_image,u.profile_type, u.gender
      FROM notification g
      JOIN users u ON g.user_id = u.id
      WHERE  g.user_id = ${user_id}  -- Use IN clause to filter by multiple user IDs
      ORDER BY g.id DESC LIMIT 5;
    `;
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.updatenotifications = async (req, res) => {
  const { user_id, user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to update notifications for multiple user IDs
    const updateQuery = `
      UPDATE notification
      SET \`read\` = 'Yes'
      WHERE user_id = ?;
    `;

    // Usage with a parameterized query
    db.query(updateQuery, [user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }
      return res
        .status(200)
        .json({ message: "Notifications updated successfully", results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
