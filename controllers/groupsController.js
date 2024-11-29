const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const moment = require("moment-timezone");
const WebSocket = require("ws");
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
exports.getgroup = async (req, res) => {
  const { user_id, orderBy } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const validOrderDirections = ["ASC", "DESC"];
    const orderDirection = validOrderDirections.includes(req.body.orderBy)
      ? req.body.orderBy
      : "DESC";
    // Query to fetch chat messages between user_id and to_id
    const query = `
      SELECT g.*, 
        u.username, u.profile_type, u.gender,
        COUNT(gi.user_id) AS total_members
      FROM groups g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN groups_invite gi ON g.id = gi.group_id AND gi.accept = 'Yes'
      WHERE g.user_id = ?
      GROUP BY g.id, u.username, u.profile_type, u.gender
      ORDER BY g.id ${orderDirection};
    `;

    // Fetching the messages
    db.query(query, [user_id, user_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
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
    "SELECT COUNT(*) as count FROM `groups` WHERE slug = ?",
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
            "SELECT COUNT(*) as count FROM `groups` WHERE slug = ?",
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

exports.groupsave = async (req, res) => {
  console.log(req.body);
  console.log("ss");
  const {
    user_id,
    name,
    makeImageUse,
    description,
    image, // Optional, depending on your needs
  } = req.body;

  // Validate required fields
  if (!user_id || !name || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const groupImage = req.file?.location || null; // For single file upload

  try {
    // Create Date objects and validate

    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    var mp = req.body.makeImageUse;
    mp = mp === true || mp === "true" ? 1 : 0;

    // Generate a unique slug for the group name
    createUniqueSlug(name, (err, slug) => {
      console.log(mp);
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err });
      }

      db.query(
        "INSERT INTO groups (makeImageUse,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [mp, slug, groupImage, user_id, name, description, date],
        (err, result) => {
          if (err) {
            console.error("Database insertion error:", err); // Log error to console
            return res.status(500).json({
              message: "Database insertion error",
              error: err,
            });
          }

          res.status(201).json({
            message: "Group created successfully",
            GroupId: result.insertId,
            user_id: user_id,
            slug: slug, // Return the generated slug
          });
        }
      );
      // Insert the group data including the slug
    });
  } catch (error) {
    console.error("Group creation error:", error); // Log error to console
    res.status(500).json({ message: "Group creation error", error });
  }
};

exports.getGroupDetailSlug = async (req, res) => {
  const slug = req.body.slug;
  // Validate required fields
  if (!slug) {
    return res.status(400).json({ message: "Slug is required." });
  }

  try {
    // Fetch the group for the given group_id
    db.query(
      `SELECT *
      FROM groups
      WHERE slug = ?`,
      [slug],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, group: "" });
        }

        if (results.length === 0) {
          return res
            .status(200)
            .json({ message: "Group not found.", group: "" });
        }

        // Return the first Group since we expect only one row
        res.status(200).json({
          message: "Group retrieved successfully.",
          group: results[0], // Return the first Group object
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.UsercheckAccept = async (req, res) => {
  const { slug, user_id } = req.body;
  if (!slug || !user_id) {
    return res.status(400).json({ message: "User ID are required." });
  }
  // console.log(req.body);
  try {
    db.query(
      `SELECT e.id AS group_id, e.name AS group_name, 
       e.user_id AS creator_id, 
       ei.sent_id AS invited_user_id,
       ei.accept AS invite_status,
       CASE 
         WHEN e.user_id = ? THEN 'Created by You'  -- Placeholder for the logged-in user ID
         WHEN ei.accept = 'Yes' THEN 'Invite Accepted'
         ELSE 'Invite Not Accepted'
       END AS group_status
      FROM groups e
      LEFT JOIN groups_invite ei
        ON e.id = ei.group_id
        AND ei.sent_id = ?  -- Placeholder for the invited user ID
      WHERE (e.user_id = ? OR ei.sent_id = ?)  -- Placeholder for the logged-in user ID
        AND e.slug = ?;  -- Placeholder for the group slug
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
    console.error("group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "group retrieval error", error });
  }
};

exports.userDeleteGroup = async (req, res) => {
  const group_id = req.body.group_id;

  // Validate required fields
  if (!group_id) {
    return res.status(400).json({ message: "Group ID is required." });
  }

  try {
    // Check if the Group exists

    db.query(
      `DELETE FROM groups WHERE id = ?`,
      [group_id],
      (deleteErr, deleteResults) => {
        if (deleteErr) {
          console.error("Error deleting group:", deleteErr);
          return res
            .status(500)
            .json({ message: "Error deleting group", error: deleteErr });
        }

        // Check if any rows were affected
        if (deleteResults.affectedRows === 0) {
          db.query(
            `DELETE FROM groups_invite WHERE group_id = ?`,
            [group_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM groups_intersted WHERE group_id = ?`,
            [group_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM group_post WHERE group_id = ?`,
            [group_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM group_post_comment WHERE group_id = ?`,
            [group_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );
          db.query(
            `DELETE FROM group_post_favourite WHERE group_id = ?`,
            [group_id],
            (deleteErr, deleteResults) => {
              // Check if any rows were affected
            }
          );

          return res
            .status(404)
            .json({ message: "Group not found or already deleted." });
        }

        res.status(200).json({ message: "Group deleted successfully." });
      }
    );
  } catch (error) {
    console.error("Group deletion error:", error); // Log error to console
    res.status(500).json({ message: "Group deletion error", error });
  }
};

exports.getGroupdetailAllIntersted = async (req, res) => {
  //console.log(req.body);
  const group_id = req.body.group_id;
  const user_id = req.body.user_id;
  // Validate required fields
  if (!group_id) {
    return res.status(400).json({ message: "Group ID is required." });
  }

  try {
    // Fetch the Group for the given group_id
    db.query(
      `SELECT 
    ei.*, 
    u.username, 
    u.profile_image 
FROM 
    groups_intersted ei 
LEFT JOIN 
    users u ON ei.user_id = u.id 
WHERE 
    ei.group_id = ? 
    AND ei.status = 'Yes';

      `,
      [group_id],
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
            .json({ message: "Group not found.", results: "" });
        }

        // Return the first Group since we expect only one row
        res.status(200).json({
          message: "Get group interested successfully.",
          results: results, // Return the first Group object
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.getallYourgroupsUser = async (req, res) => {
  const user_id = req.body.user_id;
  const group_id = req.body.group_id;

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all Group for the given user_id

    db.query(
      `SELECT u.*
      FROM users u
      LEFT JOIN friendRequest_accept fr ON 
        (u.id = fr.sent_to AND fr.user_id = ?) OR 
        (u.id = fr.user_id AND fr.sent_to = ?)
      WHERE u.id NOT IN (
          SELECT user_id
          FROM groups_invite
          WHERE group_id = ?
      )
      AND u.id NOT IN (
          SELECT sent_id
          FROM groups_invite
          WHERE group_id = ?
      )
      AND (fr.status = "Yes") 
      AND u.id != ?`,
      [user_id, user_id, group_id, group_id, user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(200).json({
          message: "",
          groups: results, // This will include all users excluding user with ID 2
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.sendGroupinvite = async (req, res) => {
  const user_id = req.body.user_id; // Get user_id from the request body
  const groupId = req.body.groupId; // Get user_id from the request body
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
          `INSERT INTO groups_invite (sent_id,user_id, group_id, accept,date) VALUES (?, ?, ?,?,?)`,
          [friendId, user_id, groupId, "No", datee], // Assuming "No" as default acceptance status
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

exports.get__groupDetailSetId = async (req, res) => {
  const slug = req.body.slug;
  //console.log(slug);
  // Validate required fields
  if (!slug) {
    return res.status(400).json({ message: "Slug is required." });
  }

  try {
    // Fetch the group for the given group_id
    db.query(
      `SELECT *
      FROM groups
      WHERE slug = ?`,
      [slug],
      (err, row) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, group: "" });
        }

        // Return the first Group since we expect only one row
        res.status(200).json({
          message: "Group retrieved successfully.",
          group: row[0], // Return the first Group object
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};
exports.getAllgroup = async (req, res) => {
  const { user_id } = req.body;
  console.log(user_id);
  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch groups that the user is part of
    db.query(
      `SELECT g.*, COUNT(gi.group_id) AS total_members
          FROM groups g
          LEFT JOIN groups_invite gi ON g.id = gi.group_id AND gi.accept = 'Yes'
          WHERE g.user_id IN (${user_id})
          GROUP BY g.id
          ORDER BY g.id DESC;
          
      `,
      [user_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the group data in the response
        return res.status(200).json({ results });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.DeleteInviteRequest = async (req, res) => {
  const group_id = req.body.group_id;
  const user_id = req.body.user_id;
  console.log(req.body);
  // Validate required fields
  if (!group_id) {
    return res.status(400).json({ message: "Group ID is required." });
  }

  try {
    // Check if the Group exists

    db.query(
      `DELETE FROM groups_invite WHERE group_id = ? And sent_id =?`,
      [group_id, user_id],
      (deleteErr, deleteResults) => {
        if (deleteErr) {
          console.error("Error deleting Group:", deleteErr);
          return res
            .status(500)
            .json({ message: "Error deleting Group", error: deleteErr });
        }

        // Check if any rows were affected

        res.status(200).json({ message: "Group deleted successfully." });
      }
    );
  } catch (error) {
    console.error("Group deletion error:", error); // Log error to console
    res.status(500).json({ message: "Group deletion error", error });
  }
};

exports.userGroupIntersted = async (req, res) => {
  const { group_id, user_id } = req.body;

  // Validate required fields
  if (!group_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Group ID and User ID are required." });
  }

  try {
    // Check if the entry already exists
    var status = "Yes";
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `SELECT * FROM groups_intersted WHERE user_id = ? AND group_id = ?`,
      [user_id, group_id],
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
            `DELETE FROM groups_intersted WHERE user_id = ? AND group_id = ?`,
            [user_id, group_id],
            (deleteErr) => {
              if (deleteErr) {
                console.error("Database delete error:", deleteErr);
                return res
                  .status(500)
                  .json({ message: "Database delete error", error: deleteErr });
              }

              res.status(200).json({
                message: "Group interest deleted successfully.",
                status: "2",
              });
            }
          );
        } else {
          // If not exists, insert a new record
          db.query(
            `INSERT INTO groups_intersted (user_id, group_id, status, date) VALUES (?, ?, ?, ?)`,
            [user_id, group_id, status, date],
            (insertErr) => {
              if (insertErr) {
                console.error("Database insert error:", insertErr);
                return res
                  .status(500)
                  .json({ message: "Database insert error", error: insertErr });
              }

              res.status(201).json({
                message: "Group interest created successfully.",
                status: "1",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.get_userGroupIntersted = async (req, res) => {
  const { group_id, user_id } = req.body;
  console.log("int");
  console.log(req.body);
  // Validate required fields
  if (!group_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Group ID and User ID are required." });
  }

  try {
    // Check if the entry already exists

    db.query(
      `SELECT * FROM groups_intersted WHERE user_id = ? AND group_id = ?`,
      [user_id, group_id],
      (err, row) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(201).json({
          message: "Group interested.",
          results: row,
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.groupAccepted = async (req, res) => {
  const group_id = req.body.group_id;
  const user_id = req.body.user_id;
  const wss = req.wss;
  // Validate required fields
  if (!group_id) {
    return res.status(400).json({ message: "Group ID is required." });
  }

  try {
    // Check if the Group exists

    db.query(
      `UPDATE groups_invite SET accept = ? WHERE group_id = ? AND sent_id = ?`,
      ["Yes", group_id, user_id],
      (updateErr, updateResults) => {
        if (updateErr) {
          console.error("Error updating group invite:", updateErr);
          return res
            .status(500)
            .json({ message: "Error updating group invite", error: updateErr });
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
            event: "grouprequest_acceptnotification",
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
            .json({ message: "Group invite updated successfully." });
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
              const notificationMessage = ` joined group`;
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
    console.error("Group deletion error:", error); // Log error to console
    res.status(500).json({ message: "Group deletion error", error });
  }
};

exports.createGroupPost = async (req, res) => {
  const { group_id, user_id, description } = req.body;
  // Validate required fields
  if (!group_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Group ID and User ID are required." });
  }
  const groupImage = req.file?.location || null; // For single file upload
  //console.log(Group);
  try {
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `INSERT INTO group_post (user_id, group_id, file,description, date) VALUES (?, ?, ?, ?, ?)`,
      [user_id, group_id, groupImage, description, date],
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
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.get_postComment = async (req, res) => {
  const group_id = req.body.group_id;
  const user_id = req.body.user_id;
  //console.log(req.body);
  if (!group_id) {
    return res.status(400).json({ message: "Group ID is required" });
  }

  try {
    // Fetch all Group for the given group_id and logged_in_user_id
    db.query(
      `SELECT 
          ep.*, 
          u.username AS group_user_username, 
          u.profile_image AS group_user_profile_image,
          epc.id AS post_id, 
          epc.description AS post_description, 
          epc.user_id AS post_user_id,
          epc.date AS comment_date,
          uc.username AS comment_user_username,
          uc.profile_image AS comment_user_profile_image,
          COUNT(ucf.user_id) AS fav_count,
          MAX(CASE WHEN ucf.user_id = ? THEN 1 ELSE 0 END) AS fav -- Check if the logged-in user has favorited the post
       FROM group_post ep
       JOIN users u ON ep.user_id = u.id -- User who created the group post
       LEFT JOIN group_post_comment epc ON ep.id = epc.group_post_id
       LEFT JOIN users uc ON epc.user_id = uc.id
       LEFT JOIN group_post_favourite ucf ON ep.id = ucf.post_id
       WHERE ep.group_id = ?
       GROUP BY ep.id, epc.id, u.id, uc.id
       ORDER BY ep.id DESC;
      `,
      [user_id, group_id], // Pass logged_in_user_id and Group
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
              group_id: row.group_id,
              file: row.file,
              description: row.description,
              date: row.date,
              username: row.group_user_username, // Use alias for username
              profile_image: row.group_user_profile_image, // Use alias for profile image
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
              group_id: row.group_id,
              description: row.post_description,
              comment_date: row.comment_date,
              user_id: row.post_user_id,
            });
          }
        });
        //console.log(postsArray);
        // Return the formatted posts array
        res.status(200).json({
          message: "Group posts and comments retrieved successfully",
          results: postsArray,
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.CreateGroupPostComment = async (req, res) => {
  const { group_id, user_id, comment, post_id } = req.body;
  const wss = req.wss;
  // Validate required fields
  if (!group_id || !user_id) {
    return res
      .status(400)
      .json({ message: "Group ID and User ID are required." });
  }

  try {
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    db.query(
      `INSERT INTO group_post_comment (group_post_id, user_id, group_id,description, date) VALUES (?, ?, ?, ?, ?)`,
      [post_id, user_id, group_id, comment, date],
      (insertErr, results) => {
        if (insertErr) {
          console.error("Database insert error:", insertErr);
          return res.status(500).json({
            message: "Database insert error",
            error: insertErr,
            status: "",
          });
        }
        const latestCommentId = results.insertId; // Capture the latest inserted comment ID

        // Create the formatted broadcast message

        db.query(
          `SELECT group_post_comment.*, users.username, users.profile_image
          FROM group_post_comment
          JOIN users ON users.id = group_post_comment.user_id
          WHERE group_post_comment.id = ?;
          `,
          [latestCommentId],
          (err, row) => {
            if (err) {
              return res.status(500).json({
                message: "Database query error",
                error: err,
              });
            }
            var rr = row[0];
            const broadcastMessage = JSON.stringify({
              event: "groupComments",
              post_id: post_id,
              post: {
                post_id: latestCommentId, // Unique ID for this new comment
                comment_user_username: rr.username, // Username of commenter
                comment_user_profile_image: rr.profile_image, // Profile image URL
                group_id: group_id,
                description: comment,
                comment_date: rr.date,
                user_id: user_id,
              },
            });
            //console.log(broadcastMessage);
            if (wss) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  console.log(client.to_id);

                  client.send(broadcastMessage);
                }
              });
            }
          }
        );

        res.status(200).json({
          message: "Post created successfully.",
          status: "1",
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.GrouppostFavourite = async (req, res) => {
  const { group_id, user_id, post_id } = req.body;
  const wss = req.wss;
  // Validate required fields
  if (!group_id || !user_id) {
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
      `SELECT * FROM group_post_favourite WHERE user_id = ? AND group_id = ? AND post_id = ?`,
      [user_id, group_id, post_id],
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
            `DELETE FROM group_post_favourite WHERE user_id = ? AND group_id = ? AND post_id = ?`,
            [user_id, group_id, post_id],
            (deleteErr) => {
              if (deleteErr) {
                console.error("Database delete error:", deleteErr);
                return res
                  .status(500)
                  .json({ message: "Database delete error", error: deleteErr });
              }
              const broadcastMessage = JSON.stringify({
                event: "groupfav",
                post_id: post_id,
              });
              //console.log(broadcastMessage);
              if (wss) {
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    console.log(client.to_id);

                    client.send(broadcastMessage);
                  }
                });
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
            `INSERT INTO group_post_favourite (post_id,user_id, group_id, fav, date) VALUES (?, ?, ?, ?, ?)`,
            [post_id, user_id, group_id, "Like", date],
            (insertErr) => {
              if (insertErr) {
                console.error("Database insert error:", insertErr);
                return res
                  .status(500)
                  .json({ message: "Database insert error", error: insertErr });
              }

              const broadcastMessage = JSON.stringify({
                event: "groupfav",
                post_id: post_id,
              });
              //console.log(broadcastMessage);
              if (wss) {
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    console.log(client.to_id);

                    client.send(broadcastMessage);
                  }
                });
              }
              res.status(200).json({
                message: "Event Favourite post deleted successfully.",
                status: "2",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

// controllers/groupsController.js
exports.get_AllMygroup = async (req, res) => {
  const { user_id } = req.body; // Destructure user_id from req.body
  console.log(user_id);

  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch groups that the user is part of
    db.query(
      `SELECT * FROM groups WHERE user_id = ? ORDER BY id DESC;`,
      [user_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the group data in the response
        res.status(200).json({
          message: "",
          result: results,
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getmostpopularGroups = async (req, res) => {
  const { user_id } = req.body; // Destructure user_id from req.body
  console.log(user_id);

  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch groups that the user is part of
    db.query(
      `SELECT 
            g.id AS group_id,
            g.slug,
            g.name,
            g.description,
            g.image,
            g.user_id,
            COUNT(gi.group_id) AS total_accepted_invites
        FROM 
            groups g
        JOIN 
            groups_invite gi ON g.id = gi.group_id
        WHERE 
            gi.accept = 'Yes' 
            AND g.user_id = ?
        GROUP BY 
            g.id, g.slug, g.name, g.description, g.image, g.user_id
        ORDER BY 
            total_accepted_invites DESC
        LIMIT 10;
`,
      [user_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the group data in the response
        res.status(200).json({
          message: "",
          result: results,
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getgroupSearch = async (req, res) => {
  const { user_id, search } = req.body;
  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Prepare the search term for SQL query
    const searchTerm = `%${search}%`; // Wrap search term with wildcards

    // Query to fetch groups with search functionality
    const query = `
      SELECT g.*, 
        u.username, u.profile_type, u.gender,
        COUNT(gi.user_id) AS total_members
      FROM groups g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN groups_invite gi ON g.id = gi.group_id AND gi.accept = 'Yes'
      WHERE g.user_id = ? 
      AND (g.name LIKE ? OR g.description LIKE ? OR g.slug LIKE ?)
      GROUP BY g.id, u.username, u.profile_type, u.gender
      ORDER BY g.id DESC;
    `;

    // Fetching the groups based on user_id and search criteria
    db.query(
      query,
      [user_id, searchTerm, searchTerm, searchTerm],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the groups in the response
        return res.status(200).json({ results });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getgroup_s = async (req, res) => {
  const { user_id } = req.body;
  console.log(user_id);
  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch groups that the user is part of
    db.query(
      `SELECT *
          FROM groups 
          where user_id=?
          ORDER BY id DESC;
          
      `,
      [user_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the group data in the response
        return res.status(200).json({ results });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getgroupdiscover = async (req, res) => {
  const { user_id } = req.body;
  console.log(user_id);
  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch groups that the user is part of
    db.query(
      `SELECT g.*, COUNT(gi.group_id) AS total_members
          FROM groups g
          JOIN groups_invite gi ON g.id = gi.group_id AND gi.accept = 'Yes'
          WHERE g.user_id IN (${user_id})
          GROUP BY g.id
          ORDER BY g.id DESC;
          
      `,
      [user_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the group data in the response
        return res.status(200).json({ results });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
