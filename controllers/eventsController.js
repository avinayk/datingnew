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
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/--+/g, "-"); // Replace multiple hyphens with a single one
}

// Function to create a unique slug
function createUniqueSlug(title, callback) {
  const slug = generateSlug(title);

  // Check if the slug already exists
  db.query(
    "SELECT COUNT(*) as count FROM events WHERE slug = ?",
    [slug],
    (err, rows) => {
      if (err) {
        return callback(err); // Handle the error
      }

      // If the slug exists, add a number to the end and check again
      if (rows[0].count > 0) {
        let i = 1;
        const checkSlug = () => {
          const newSlug = `${slug}-${i}`;
          db.query(
            "SELECT COUNT(*) as count FROM events WHERE slug = ?",
            [newSlug],
            (err, newRows) => {
              if (err) {
                return callback(err); // Handle the error
              }
              if (newRows[0].count === 0) {
                return callback(null, newSlug); // Return the new unique slug
              }
              i++;
              checkSlug(); // Check again with the incremented slug
            }
          );
        };
        checkSlug(); // Start checking with the incremented slug
      } else {
        callback(null, slug); // Return the original slug if it's unique
      }
    }
  );
}

exports.events = async (req, res) => {
  const { user_id, name, start_date, end_date, time, location, description } =
    req.body;

  // Validate required fields
  if (
    !user_id ||
    !name ||
    !start_date ||
    !end_date ||
    !time ||
    !location ||
    !description
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const eventImage = req.file?.location || null; // For single file upload
  try {
    // Create Date objects and validate
    const startDate = moment
      .tz(new Date(start_date), "Europe/Oslo")
      .format("YYYY-MM-DD");
    const endDate = moment
      .tz(new Date(end_date), "Europe/Oslo")
      .format("YYYY-MM-DD");
    console.log(endDate);
    // Validate date objects

    // Optionally check if start_date is before end_date
    if (startDate >= endDate) {
      return res
        .status(200)
        .json({ message: "Start date must be before end date", status: "2" });
    }

    const createdAt = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    var mp = req.body.makeImagePrivate;
    mp = mp === true || mp === "true" ? 1 : 0;

    // Generate a unique slug for the event name
    createUniqueSlug(name, (err, slug) => {
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err, status: "2" });
      }

      // Insert the event data including the slug
      db.query(
        "INSERT INTO events (makeImagePrivate,slug, image, user_id, name, start_date, end_date, time, location, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)",
        [
          mp,
          slug,
          eventImage,
          user_id,
          name,
          startDate,
          endDate,
          time,
          location,
          description,
          createdAt,
        ],
        (err, result) => {
          if (err) {
            console.error("Database insertion error:", err); // Log error to console
            return res
              .status(500)
              .json({ message: "Database insertion error", error: err });
          }

          res.status(201).json({
            message: "Event created successfully",
            eventId: result.insertId,
            user_id: user_id,
            slug: slug,
            status: "1", // Return the generated slug
          });
        }
      );
    });
  } catch (error) {
    console.error("Some thing went wrong,Please try again:", error); // Log error to console
    res
      .status(500)
      .json({ message: "Some thing went wrong,Please try again", error });
  }
};

exports.getallYourevents = async (req, res) => {
  const user_id = req.body.user_id;
  console.log(req.body);
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT * FROM events WHERE user_id = ? ORDER BY id DESC",
      [user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        if (results.length > 0) {
          res.status(200).json({
            message: "Events retrieved successfully",
            events: results,
          });
        } else {
          res.status(404).json({ message: "No events found for this user" });
        }
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getallYoureventsUser = async (req, res) => {
  const user_id = req.body.user_id;
  const event_id = req.body.event_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id

    db.query(
      `SELECT u.*
      FROM users u
      LEFT JOIN friendRequest_accept fr ON 
        (u.id = fr.sent_to AND fr.user_id = ?) OR 
        (u.id = fr.user_id AND fr.sent_to = ?)
      WHERE u.id NOT IN (
          SELECT user_id
          FROM events_invite
          WHERE event_id = ?
      )
      AND u.id NOT IN (
          SELECT sent_id
          FROM events_invite
          WHERE event_id = ?
      )
      AND (fr.status = "Yes") 
      AND u.id != ?`,
      [user_id, user_id, event_id, event_id, user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(200).json({
          message: "",
          events: results, // This will include all users excluding user with ID 2
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.sendEventinvite = async (req, res) => {
  const user_id = req.body.user_id; // Get user_id from the request body
  const eventId = req.body.eventId; // Get user_id from the request body
  const friendIds = req.body.friendIds; // Get friendIds from the request body
  //console.log(req.body); // Log request body for debugging

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
    return res.status(400).json({ message: "Friend IDs are required" });
  }

  try {
    // Prepare insert query
    var datee = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    const insertQueries = friendIds.map((friendId) => {
      return new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO events_invite (sent_id,user_id, event_id, accept,date) VALUES (?, ?, ?,?,?)`,
          [friendId, user_id, eventId, "No", datee], // Assuming "No" as default acceptance status
          (err, result) => {
            if (err) {
              console.error("Insert error:", err); // Log error
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });
    });

    // Wait for all insert queries to complete
    await Promise.all(insertQueries);

    res.status(201).json({
      message: "Invitations sent successfully.",
    });
  } catch (error) {
    console.error("Error sending invitations:", error); // Log error to console
    res.status(500).json({ message: "Error sending invitations", error });
  }
};

exports.get_EventDetail = async (req, res) => {
  const event_id = req.body.event_id;
  // Validate required fields
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      `SELECT *
      FROM events
      WHERE id = ?`,
      [event_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, event: "" });
        }

        if (results.length === 0) {
          return res
            .status(200)
            .json({ message: "Event not found.", event: "" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "Event retrieved successfully.",
          event: results[0], // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};
exports.get_EventDetailSlug = async (req, res) => {
  const slug = req.body.slug;
  // Validate required fields
  if (!slug) {
    return res.status(400).json({ message: "Event Slug is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      `SELECT *
      FROM events
      WHERE slug = ?`,
      [slug],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, event: "" });
        }

        if (results.length === 0) {
          return res
            .status(200)
            .json({ message: "Event not found.", event: "" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "Event retrieved successfully.",
          event: results[0], // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.userDeleteEvent = async (req, res) => {
  const event_id = req.body.event_id;

  // Validate required fields
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    // Check if the event exists

    db.query(
      `DELETE FROM events WHERE id = ?`,
      [event_id],
      (deleteErr, deleteResults) => {
        if (deleteErr) {
          console.error("Error deleting event:", deleteErr);
          return res
            .status(500)
            .json({ message: "Error deleting event", error: deleteErr });
        }

        // Check if any rows were affected
        if (deleteResults.affectedRows === 0) {
          db.query(
            `DELETE FROM events_invite WHERE event_id = ?`,
            [event_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM events_intersted WHERE event_id = ?`,
            [event_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM event_post WHERE event_id = ?`,
            [event_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM event_post_comment WHERE event_id = ?`,
            [event_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM event_post_favourite WHERE event_id = ?`,
            [event_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );

          return res
            .status(404)
            .json({ message: "Event not found or already deleted." });
        }

        res.status(200).json({ message: "Event deleted successfully." });
      }
    );
  } catch (error) {
    console.error("Event deletion error:", error); // Log error to console
    res.status(500).json({ message: "Event deletion error", error });
  }
};

exports.getallevents = async (req, res) => {
  const user_id = req.body.user_id;
  console.log(req.body);
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query("SELECT * FROM events  ORDER BY id DESC", (err, results) => {
      if (err) {
        console.error("Database query error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }

      // If events are found, return them; otherwise, return a message
      if (results.length > 0) {
        res.status(200).json({
          message: "Events retrieved successfully",
          events: results,
        });
      } else {
        res.status(404).json({ message: "No events found for this user" });
      }
    });
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getalleventsWithInterseted = async (req, res) => {
  const { id, user_id } = req.body;
  console.log(req.body);
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      `SELECT 
          e.*, 
          ei.id AS inter_id, 
          CASE 
              WHEN ei.event_id IS NOT NULL THEN true 
              ELSE false 
          END AS is_interested
      FROM 
          events e 
      LEFT JOIN 
          events_intersted ei ON e.id = ei.event_id AND ei.user_id = ? 
          WHERE e.user_id IN (${user_id})
      ORDER BY 
          e.id DESC;`,
      [id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        if (results.length > 0) {
          res.status(200).json({
            message: "Events retrieved successfully",
            events: results,
          });
        } else {
          res.status(404).json({ message: "No events found for this user" });
        }
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.get_EventdetailAllIntersted = async (req, res) => {
  const event_id = req.body.event_id;
  const user_id = req.body.user_id;
  // Validate required fields
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      `SELECT 
          ei.*, 
          u.username, 
          u.profile_image 
      FROM 
          events_intersted ei 
      LEFT JOIN 
          users u ON ei.user_id = u.id 
      WHERE 
          ei.event_id = ? AND 
          ei.user_id != ?;

      `,
      [event_id, user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        if (results.length === 0) {
          return res
            .status(200)
            .json({ message: "Event not found.", results: "" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "Event interested successfully.",
          results: results, // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.userEventIntersted = async (req, res) => {
  const { event_id, user_id } = req.body;

  // Validate required fields
  if (!event_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Event ID and User ID are required." });
  }

  try {
    // Check if the entry already exists
    var status = "Yes";
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `SELECT * FROM events_intersted WHERE user_id = ? AND event_id = ?`,
      [user_id, event_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        if (results.length > 0) {
          // If exists, update the existing record
          db.query(
            `DELETE FROM events_intersted WHERE user_id = ? AND event_id = ?`,
            [user_id, event_id],
            (deleteErr) => {
              if (deleteErr) {
                console.error("Database delete error:", deleteErr);
                return res
                  .status(500)
                  .json({ message: "Database delete error", error: deleteErr });
              }

              res.status(200).json({
                message: "Event interest deleted successfully.",
                status: "2",
              });
            }
          );
        } else {
          // If not exists, insert a new record
          db.query(
            `INSERT INTO events_intersted (user_id, event_id, status, date) VALUES (?, ?, ?, ?)`,
            [user_id, event_id, status, date],
            (insertErr) => {
              if (insertErr) {
                console.error("Database insert error:", insertErr);
                return res
                  .status(500)
                  .json({ message: "Database insert error", error: insertErr });
              }

              res.status(201).json({
                message: "Event interest created successfully.",
                status: "1",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.get_EventIntersted = async (req, res) => {
  const event_id = req.body.event_id;
  const user_id = req.body.user_id;

  // Validate required fields
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      `SELECT * from events_intersted
        WHERE event_id = ? And user_id = ?;

      `,
      [event_id, user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        if (results.length === 0) {
          return res
            .status(200)
            .json({ message: "Event not found.", status: "2" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "Event",
          status: "1", // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.createEventPost = async (req, res) => {
  const { event_id, user_id, description } = req.body;

  // Validate required fields
  if (!event_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Event ID and User ID are required." });
  }
  const eventImage = req.file?.location || null; // For single file upload
  //console.log(eventImage);
  try {
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `INSERT INTO event_post (user_id, event_id, file,description, date) VALUES (?, ?, ?, ?, ?)`,
      [user_id, event_id, eventImage, description, date],
      (insertErr) => {
        if (insertErr) {
          console.error("Database insert error:", insertErr);
          return res
            .status(500)
            .json({ message: "Database insert error", error: insertErr });
        }

        res.status(200).json({
          message: "Post created successfully.",
          status: "1",
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.get_postComment = async (req, res) => {
  const event_id = req.body.event_id;
  const user_id = req.body.user_id;
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  try {
    // Fetch all events for the given event_id and logged_in_user_id
    db.query(
      `SELECT 
          ep.*, 
          u.username AS event_user_username, 
          u.profile_image AS event_user_profile_image,
          epc.id AS post_id, 
          epc.description AS post_description, 
          epc.user_id AS post_user_id,
          epc.date AS comment_date,
          uc.username AS comment_user_username,
          uc.profile_image AS comment_user_profile_image,
          COUNT(ucf.user_id) AS fav_count,
          MAX(CASE WHEN ucf.user_id = ? THEN 1 ELSE 0 END) AS fav -- Check if the logged-in user has favorited the post
       FROM event_post ep
       JOIN users u ON ep.user_id = u.id -- User who created the event post
       LEFT JOIN event_post_comment epc ON ep.id = epc.event_post_id
       LEFT JOIN users uc ON epc.user_id = uc.id
       LEFT JOIN event_post_favourite ucf ON ep.id = ucf.post_id
       WHERE ep.event_id = ?
       GROUP BY ep.id, epc.id, u.id, uc.id
       ORDER BY ep.id DESC;
      `,
      [user_id, event_id], // Pass logged_in_user_id and event_id
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // Create an empty array to hold the formatted posts
        const postsArray = [];

        // Create a map to hold each post and its associated comments
        const postsMap = {};

        results.forEach((row) => {
          // If the post does not already exist in the map, create it
          if (!postsMap[row.id]) {
            postsMap[row.id] = {
              id: row.id,
              user_id: row.user_id,
              event_id: row.event_id,
              file: row.file,
              description: row.description,
              date: row.date,
              username: row.event_user_username, // Use alias for username
              profile_image: row.event_user_profile_image, // Use alias for profile image
              fav_count: row.fav_count,
              fav: row.fav === 1, // Set 'fav' as true or false depending on the logged-in user's favorite status
              post: [], // Initialize an empty array for comments
            };
            postsArray.push(postsMap[row.id]);
          }

          // If there is a comment, push it to the 'post' array
          if (row.post_id !== null) {
            postsMap[row.id].post.push({
              post_id: row.post_id,
              comment_user_username: row.comment_user_username,
              comment_user_profile_image: row.comment_user_profile_image,
              event_id: row.event_id,
              description: row.post_description,
              comment_date: row.comment_date,
              user_id: row.post_user_id,
            });
          }
        });
        //  / console.log(postsArray);
        // Return the formatted posts array
        res.status(200).json({
          message: "Event posts and comments retrieved successfully",
          results: postsArray,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.CreateEventPostComment = async (req, res) => {
  const { event_id, user_id, comment, post_id } = req.body;
  //console.log(req.body);
  const wss = req.wss;
  // Validate required fields
  if (!event_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Event ID and User ID are required." });
  }

  try {
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `INSERT INTO event_post_comment (event_post_id, user_id, event_id,description, date) VALUES (?, ?, ?, ?, ?)`,
      [post_id, user_id, event_id, comment, date],
      (insertErr) => {
        if (insertErr) {
          console.error("Database insert error:", insertErr);
          return res.status(500).json({
            message: "Database insert error",
            error: insertErr,
            status: "",
          });
        }
        const broadcastMessage = JSON.stringify({
          event: "eventComments",
          post_id: post_id,
        });
        console.log(wss);
        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log(client.to_id);

              client.send(broadcastMessage);
            }
          });
        }
        res.status(200).json({
          message: "Post created successfully.",
          status: "1",
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.EventpostFavourite = async (req, res) => {
  const { event_id, user_id, post_id } = req.body;

  // Validate required fields
  if (!event_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Event ID and User ID are required." });
  }

  try {
    // Check if the entry already exists
    var status = "Yes";
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `SELECT * FROM event_post_favourite WHERE user_id = ? AND event_id = ? AND post_id = ?`,
      [user_id, event_id, post_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        if (results.length > 0) {
          // If exists, update the existing record
          db.query(
            `DELETE FROM event_post_favourite WHERE user_id = ? AND event_id = ? AND post_id = ?`,
            [user_id, event_id, post_id],
            (deleteErr) => {
              if (deleteErr) {
                console.error("Database delete error:", deleteErr);
                return res
                  .status(500)
                  .json({ message: "Database delete error", error: deleteErr });
              }

              res.status(200).json({
                message: "Event Favourite post deleted successfully.",
                status: "2",
              });
            }
          );
        } else {
          // If not exists, insert a new record
          db.query(
            `INSERT INTO event_post_favourite (post_id,user_id, event_id, fav, date) VALUES (?, ?, ?, ?, ?)`,
            [post_id, user_id, event_id, "Like", date],
            (insertErr) => {
              if (insertErr) {
                console.error("Database insert error:", insertErr);
                return res
                  .status(500)
                  .json({ message: "Database insert error", error: insertErr });
              }

              res.status(201).json({
                message: "Event Favourite created successfully.",
                status: "1",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.GetEventPostComments = async (req, res) => {
  const event_id = req.body.event_id;
  console.log("Event ID:", event_id);
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required" });
  }

  try {
    // Fetch comments for the given event_id
    db.query(
      `SELECT 
          
          epc.event_post_id AS post_id,
          epc.id AS comment_id,
          epc.description AS comment_description,
          epc.user_id,
          epc.date AS comment_date,
          epc.event_id,
          uc.username AS comment_user_username,
          uc.profile_image AS comment_user_profile_image
      FROM event_post_comment epc
      JOIN event_post ep ON ep.id = epc.event_post_id
      JOIN users uc ON epc.user_id = uc.id
      WHERE ep.event_id = ?;`,
      [event_id], // Pass the event_id as a parameter
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        console.log("Query Results:", results); // Log the results for debugging

        // Return the results as a response
        res.status(200).json({
          message: "Comments retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error);
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getEventInterstedUser = async (req, res) => {
  const { event_id, user_id } = req.body;
  if (!event_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Event ID and User ID are required." });
  }
  console.log(req.body);
  try {
    db.query(
      `SELECT 
          ei.*, 
          u.username, 
          u.profile_image 
      FROM 
          events_intersted ei 
      LEFT JOIN 
          users u ON ei.user_id = u.id 
      WHERE 
          ei.event_id = ? AND 
          ei.user_id != ?;
`,
      [event_id, user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }
        res.status(200).json({
          message: "Intersted Users retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.UsercheckAccept = async (req, res) => {
  const { slug, user_id } = req.body;
  if (!slug || !user_id) {
    return res.status(400).json({ message: "User ID are required." });
  }
  console.log(req.body);
  try {
    db.query(
      `SELECT e.id AS event_id, e.name AS event_name, 
       e.user_id AS creator_id, 
       ei.sent_id AS invited_user_id,
       ei.accept AS invite_status,
       CASE 
         WHEN e.user_id = ? THEN 'Created by You'  -- Placeholder for the logged-in user ID
         WHEN ei.accept = 'Yes' THEN 'Invite Accepted'
         ELSE 'Invite Not Accepted'
       END AS event_status
      FROM events e
      LEFT JOIN events_invite ei
        ON e.id = ei.event_id
        AND ei.sent_id = ?  -- Placeholder for the invited user ID
      WHERE (e.user_id = ? OR ei.sent_id = ?)  -- Placeholder for the logged-in user ID
        AND e.slug = ?;  -- Placeholder for the event slug
`,
      [user_id, user_id, user_id, user_id, slug],
      (err, row) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }
        res.status(200).json({
          message: "Accept successfully",
          results: row,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.DeleteInviteRequest = async (req, res) => {
  const event_id = req.body.event_id;
  const user_id = req.body.user_id;

  // Validate required fields
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    // Check if the event exists

    db.query(
      `DELETE FROM events_invite WHERE event_id = ? And sent_id =?`,
      [event_id, user_id],
      (deleteErr, deleteResults) => {
        if (deleteErr) {
          console.error("Error deleting event:", deleteErr);
          return res
            .status(500)
            .json({ message: "Error deleting event", error: deleteErr });
        }

        // Check if any rows were affected

        res.status(200).json({ message: "Event deleted successfully." });
      }
    );
  } catch (error) {
    console.error("Event deletion error:", error); // Log error to console
    res.status(500).json({ message: "Event deletion error", error });
  }
};

exports.eventAccepted = async (req, res) => {
  const event_id = req.body.event_id;
  const user_id = req.body.user_id;
  const wss = req.wss;
  // Validate required fields
  if (!event_id) {
    return res.status(400).json({ message: "Event ID is required." });
  }

  try {
    // Check if the event exists

    db.query(
      `UPDATE events_invite SET accept = ? WHERE event_id = ? AND sent_id = ?`,
      ["Yes", event_id, user_id],
      (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error updating event invite:", updateErr);
          return res
            .status(500)
            .json({ message: "Error updating event invite", error: updateErr });
        }

        // Check if any rows were affected
        if (updateResults.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "No invite found to update." });
        }
        const query = `
        SELECT 
            u.*,
            CASE 
                WHEN fr.status = 'Yes' THEN true 
                ELSE false 
            END AS is_friend
            
        FROM 
            users u 
        JOIN 
            friendRequest_accept fr ON 
                (u.id = fr.sent_to AND fr.user_id = ?) OR 
                (u.id = fr.user_id AND fr.sent_to = ?) 
        
        WHERE 
            fr.status = 'Yes'  -- Ensure that the friend request is accepted;;`;

        // Fetching the messages
        db.query(query, [user_id, user_id], (err, results) => {
          if (err) {
            return res.status(500).json({
              message: "Database query error",
              error: err,
            });
          }

          const broadcastMessage = JSON.stringify({
            event: "eventrequest_acceptnotification",
            user_id: results,
            LoginData: results,
          });
          //console.log(wss);
          if (wss) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                console.log(client.to_id);

                client.send(broadcastMessage);
              }
            });
          }
          res
            .status(200)
            .json({ message: "Event invite updated successfully." });
          db.query(
            `SELECT username FROM users WHERE id = ?`,
            [user_id], // Fetch the username of the user who sent the friend request
            (err, senderResult) => {
              if (err) {
                return res.status(500).json({
                  message: "Error fetching username for sentto",
                  error: err,
                });
              }
              const senderUsername =
                senderResult[0]?.username || "Unknown User"; // Username of the user who sent the request

              // Prepare the notification message
              const notificationMessage = ` joined event`;
              const date = moment
                .tz(new Date(), "Europe/Oslo")
                .format("YYYY-MM-DD HH:mm:ss");
              results.forEach((item) => {
                const user_id = item.id; // Use `id` from the results array

                db.query(
                  "INSERT INTO notification (user_id,message, date) VALUES (?, ?, ?)",
                  [user_id, notificationMessage, date],
                  (err, result) => {
                    if (err) {
                      console.error("Database insertion error:", err); // Log error to console
                    }
                  }
                );
              });
            }
          );
        });
      }
    );
  } catch (error) {
    console.error("Event deletion error:", error); // Log error to console
    res.status(500).json({ message: "Event deletion error", error });
  }
};

exports.getAlleventsSearch = async (req, res) => {
  const { user_id, search, user_ids } = req.body;
  console.log(req.body);

  // Validate required fields
  if (!user_ids) {
    return res.status(400).json({ message: "User IDs are required" });
  }

  try {
    // Prepare the search term with wildcard pattern
    const searchTerm = search ? `%${search}%` : "%";

    // SQL query with dynamic search conditions
    const query = `
      SELECT 
          e.*, 
          ei.id AS inter_id, 
          CASE 
              WHEN ei.event_id IS NOT NULL THEN true 
              ELSE false 
          END AS is_interested
      FROM 
          events e 
      LEFT JOIN 
          events_intersted ei ON e.id = ei.event_id AND ei.user_id = ? 
      WHERE 
          e.user_id IN (${user_ids}) 
          AND (e.name LIKE ? OR e.description LIKE ? OR e.location LIKE ? OR e.start_date LIKE ? OR e.end_date LIKE ?)
      ORDER BY 
          e.id DESC;
    `;

    db.query(
      query,
      [user_id, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }
        console.log(results);
        res.status(200).json({
          message: "Events retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error);
    res.status(500).json({ message: "Event retrieval error", error });
  }
};
exports.geteventsSearch = async (req, res) => {
  const { user_id, search } = req.body;
  console.log(req.body);
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const searchTerm = search ? `%${search}%` : "%";
    // Fetch all events for the given user_id
    db.query(
      "SELECT * FROM events WHERE user_id = ? AND (name LIKE ? OR description LIKE ? OR location LIKE ? OR start_date LIKE ? OR end_date LIKE ?) ORDER BY id DESC",
      [user_id, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Events retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getalleventsDiscover = async (req, res) => {
  const { id, user_id } = req.body;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      `SELECT 
          e.*, 
          ei.id AS inter_id, 
          CASE 
              WHEN ei.event_id IS NOT NULL THEN true 
              ELSE false 
          END AS is_interested
      FROM 
          events e 
      JOIN 
          events_intersted ei ON e.id = ei.event_id AND ei.user_id = ? 
          WHERE e.user_id IN (${user_id})
      ORDER BY 
          e.id DESC;`,
      [id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Events retrieved successfully",
          events: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};
