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

const Stripe = require("stripe");
const stripe = new Stripe("sk_test_51Kfh7vSDkHpCV7qI8zNDmRe21ns14eXfXvAgY0N0dpYr3s8ZHKpHctM1e3VbVhcsMRWQj5RrPmnhf8lU0meSgWAz00T56NOyv8");

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
exports.getAllMembers = async(req, res) => {
    var user_id = req.body.user_id;
    try {
        // Ensure the email is provided

        // Query the database to get the user's profile details
        db.query(
            `SELECT 
        u.*, 
        CASE 
            WHEN fr.status = 'Yes' THEN true 
            ELSE false 
        END AS is_friend,
        fr.status AS friend_status
    FROM 
        users u
    LEFT JOIN 
        friendRequest_accept fr 
        ON (u.id = fr.sent_to AND fr.user_id = ?) 
        OR (u.id = fr.user_id AND fr.sent_to = ?)
    WHERE 
        u.id != ?;
`, [user_id, user_id, user_id],
            (err, row) => {
                console.log(row);
                return res.status(200).json({ results: row });
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
exports.getcheckfriendss = async(req, res) => {
    var user_id = req.body.user_id;
    var to_id = req.body.to_id;
    try {
        // Query the database to check if the users are friends
        db.query(
            `SELECT 
        u.*, 
        CASE 
            WHEN fr.status = 'Yes' THEN true 
            ELSE false 
        END AS is_friend,
        fr.status AS friend_status
    FROM 
        users u
    LEFT JOIN 
        friendRequest_accept fr 
        ON (u.id = fr.sent_to AND fr.user_id = ?) 
        OR (u.id = fr.user_id AND fr.sent_to = ?)
    WHERE 
        (u.id = ? OR u.id = ?);`, [user_id, to_id, user_id, user_id], // Parameters to check both users
            (err, results) => {
                if (err) {
                    return res
                        .status(500)
                        .json({ message: "Error executing query", error: err });
                }

                // Return the results
                return res.status(200).json({ results: results });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
// exports.getAllMembers = async (req, res) => {
//   var user_id = req.body.user_id;
//   try {
//     // Ensure the email is provided

//     // Query the database to get the user's profile details
//     db.query(
//       `SELECT
//         u.*,
//         CASE
//             WHEN fr.status = 'Yes' THEN true
//             ELSE false
//         END AS is_friend
//         FROM
//             users u
//         LEFT JOIN
//             friendRequest_accept fr
//         ON
//             (u.id = fr.sent_to AND fr.user_id = ?) OR
//             (u.id = fr.user_id AND fr.sent_to = ?) where u.id != ? And fr.status = 'Yes';`,
//       [user_id, user_id, user_id],
//       (err, results) => {
//         return res.status(200).json({ results: results });
//       }
//     );
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };

exports.getUserDetailMember = async(req, res) => {
    var id = req.body.id;
    var user_id = req.body.user_id;
    var to_id = req.body.to_id;
    try {
        // Ensure the email is provided

        // Query the database to get the user's profile details
        db.query(
            `SELECT 
        users.*, 
        userphotoPrivate.user_id, 
        userphotoPrivate.to_id, 
        userphotoPrivate.status As uStatus
    FROM 
        users 
    LEFT JOIN 
        userphotoPrivate ON userphotoPrivate.to_id = users.id 
        AND userphotoPrivate.user_id = ? -- Only match with user_id
    WHERE 
        users.id = ?
        AND (userphotoPrivate.status = 'Yes' OR userphotoPrivate.status IS NULL OR userphotoPrivate.status = 'No')
        AND (userphotoPrivate.to_id = ? OR userphotoPrivate.to_id IS NULL)
    ORDER BY 
        users.id DESC;`, [user_id, id, to_id],
            (err, row) => {
                return res.status(200).json({ row: row });
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

exports.getEvent_s = async(req, res) => {
    const { user_id } = req.body;
    console.log(req.body);
    console.log("ch");
    // Validate required fields
    if (!user_id) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        // Fetch all events for the given user_id
        db.query(
            "SELECT * FROM events WHERE user_id = ? And makeImagePrivate = ? ORDER BY id DESC", [user_id, "0"],
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

exports.getAllfriend_s = async(req, res) => {
    var user_id = req.body.user_id;
    //console.log(user_id);
    try {
        // Ensure the email is provided
        if (!user_id) {
            return res.status(400).json({ message: "User id  is required" });
        }

        // Query the database to get the user's profile details
        db.query(
            `SELECT 
          u.*, 
          fr.status 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          (u.id = fr.sent_to AND fr.user_id = ?) OR 
          (u.id = fr.user_id AND fr.sent_to = ?) 
      WHERE 
          fr.status = ?;
`, [user_id, user_id, "Yes"],
            (err, results) => {
                if (err) {
                    return res
                        .status(500)
                        .json({ message: "Database query error", error: err });
                }

                res.status(200).json({
                    message: "All friend",
                    results: results, // Return the first event object
                });
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

exports.getCheck_friend = async(req, res) => {
    console.log(req.body);
    const { id, user_id } = req.body;

    try {
        // Ensure user_id and id are provided
        if (!user_id || !id) {
            return res
                .status(400)
                .json({ message: "Both user_id and id are required" });
        }

        // Query to check if the user is a friend or not
        const query = `
      SELECT 
      u.*, 
      fr.status 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          (u.id = fr.sent_to AND fr.user_id = ?) 
          OR (u.id = fr.user_id AND fr.sent_to = ?) 
      WHERE  (fr.user_id = ? OR fr.sent_to = ?) 
          AND u.id != ?;
;
    `;

        db.query(
            query, [user_id, id, user_id, id, user_id], // Added correct number of parameters
            (err, row) => {
                if (err) {
                    return res.status(500).json({
                        message: "Database query error",
                        error: err,
                    });
                }

                if (row.length === 0) {
                    return res
                        .status(200)
                        .json({ message: "No friends found", results: row });
                }

                res.status(200).json({
                    message: "Friendship status retrieved successfully",
                    results: row, // Return the friend rows
                });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getCheck_friendUser = async(req, res) => {
    console.log(req.body);
    const { id, user_id } = req.body;

    try {
        // Ensure user_id and id are provided
        if (!user_id || !id) {
            return res
                .status(400)
                .json({ message: "Both user_id and id are required" });
        }

        // Query to check if the user is a friend or not
        const query = `
      SELECT 
      u.*, 
      fr.status 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          (u.id = fr.sent_to AND fr.user_id = ?) 
          OR (u.id = fr.user_id AND fr.sent_to = ?) 
      WHERE  (fr.user_id = ? OR fr.sent_to = ?) 
          AND u.id != ? And fr.status='Yes';
;
    `;

        db.query(
            query, [user_id, user_id, id, id, user_id], // Added correct number of parameters
            (err, row) => {
                if (err) {
                    return res.status(500).json({
                        message: "Database query error",
                        error: err,
                    });
                }

                if (row.length === 0) {
                    return res
                        .status(200)
                        .json({ message: "No friends found", results: row });
                }

                res.status(200).json({
                    message: "Friendship status retrieved successfully",
                    results: row, // Return the friend rows
                });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.sendFriendRequest = async(req, res) => {
    const { user_id, sent_id } = req.body;

    try {
        // Ensure user_id and sent_to are provided
        if (!user_id || !sent_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and sent_id are required" });
        }
        var date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");
        // Insert friend request into the database
        const query = `
      INSERT INTO friendRequest_accept (user_id, sent_to, status,date) 
      VALUES (?, ?, ?,?);
    `;

        db.query(query, [user_id, sent_id, "No", date], (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Database insertion error",
                    error: err,
                });
            }

            res.status(200).json({
                message: "Friend request sent successfully",
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getuserChatmessage = async(req, res) => {
    const { user_id, to_id } = req.body;
    console.log(req.body);
    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        // Query to fetch chat messages between user_id and to_id
        const query = `
      SELECT 
        cm.*,
        cm.read, 
        u1.profile_image AS user1_profile, 
        u2.profile_image AS user2_profile,
        u1.id AS user1_id,
        u2.id AS user2_id
      FROM 
        chatmessages cm
      JOIN 
        users u1 ON cm.user_id = u1.id
      JOIN 
        users u2 ON cm.to_id = u2.id
      WHERE 
        (cm.user_id = ? AND cm.to_id = ?) OR 
        (cm.user_id = ? AND cm.to_id = ?)
      ORDER BY cm.date ASC; 
    `;

        // Fetching the messages
        db.query(query, [user_id, to_id, to_id, user_id], (err, results) => {
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

exports.saveUserChat = async(req, res) => {
    const { user_id, to_id, message } = req.body;
    //console.log(req.body);

    const wss = req.wss; // Get the WebSocket server instance from the request

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        // Prepare the current date
        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");

        // Retrieve file URLs from the request
        const fileUrls = req.files ? req.files.map((file) => file.location) : []; // Get S3 URLs from uploaded files

        // Prepare data to save into the database
        const data = {
            user_id: user_id,
            to_id: to_id,
            files: JSON.stringify(fileUrls), // Store the files array as a JSON string
            message: message, // Insert the message
            date: date,
        };

        // Insert the message along with file URLs into a single database row
        db.query(
            "INSERT INTO chatmessages (user_id, to_id, file, message, date) VALUES (?, ?, ?, ?, ?)", [data.user_id, data.to_id, data.files, data.message, data.date],
            (insertErr, result) => {
                if (insertErr) {
                    // console.error("Database insert error:", insertErr);
                    return res.status(500).json({
                        message: "Database insert error",
                        error: insertErr,
                        status: "",
                    });
                }
                const lastInsertId = result.insertId;
                // Broadcast the message to WebSocket clients
                const broadcastMessage = JSON.stringify({
                    event: "ChatMessage",
                    user_id: user_id,
                    to_id: to_id,
                    message: message,
                    file: fileUrls, // Send files as an array
                    date: date,
                    lastInsertId: lastInsertId,
                });

                if (wss) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            console.log(client.to_id);

                            client.send(broadcastMessage);
                        }
                    });
                }

                // Return success response
                res.status(200).json({
                    message: message,
                    user_id: user_id,
                    to_id: to_id,
                    file: fileUrls,
                    status: "1",
                });
            }
        );
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.getSEndMessage = async(req, res) => {
    const { data } = req.body;
    console.log(req.body);
    try {
        // Ensure user_id and to_id are provided
        const { user_id, to_id } = data; // Destructure user_id and to_id

        // Query to fetch chat messages between user_id and to_id
        const query = `
          SELECT 
              cm.*, 
              u1.profile_image AS user1_profile, 
              u2.profile_image AS user2_profile
          FROM 
              chatmessages cm
          JOIN 
              users u1 ON cm.user_id = u1.id
          JOIN 
              users u2 ON cm.to_id = u2.id
          WHERE 
              (cm.user_id = ? AND cm.to_id = ?) OR 
              (cm.user_id = ? AND cm.to_id = ?)
          ORDER BY 
              cm.date DESC LIMIT 1
      `;

        // Fetching the messages
        db.query(query, [user_id, to_id, to_id, user_id], (err, results) => {
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

exports.getAllgallery = async(req, res) => {
    const { user_ids } = req.body; // Expecting a string of user IDs

    try {
        // Ensure user_ids is provided
        if (!user_ids) {
            return res.status(400).json({ message: "User IDs are required" });
        }

        // Prepare SQL query to fetch galleries for multiple user IDs
        const query = `
          SELECT g.*, u.username, u.profile_type, u.gender
          FROM gallery g
          JOIN users u ON g.user_id = u.id
          WHERE g.user_id IN (${user_ids})  -- Use IN clause to filter by multiple user IDs
          ORDER BY g.id DESC;
      `;

        // Fetching the galleries
        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Sending the gallery data in the response
            return res.status(200).json({ results });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.getAllfriends = async(req, res) => {
    const { user_id } = req.body;
    try {
        // Ensure user_id and to_id are provided
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Query to fetch chat messages between user_id and to_id
        const query = `
     SELECT 
    u.*, 
    CASE 
        WHEN fr.status = 'Yes' THEN true 
        ELSE false 
    END AS is_friend,
    CASE 
        WHEN bu.user_id IS NOT NULL THEN true 
        ELSE false 
    END AS is_blocked
FROM 
    users u 
JOIN 
    friendRequest_accept fr 
    ON (u.id = fr.sent_to AND fr.user_id = ?) 
    OR (u.id = fr.user_id AND fr.sent_to = ?) 
LEFT JOIN 
    blockuser bu 
    ON (u.id = bu.user_id AND bu.to_id = ?) 
    OR (u.id = bu.to_id AND bu.user_id = ?)
WHERE 
    fr.status = 'Yes' 
    AND (
        bu.user_id IS NULL  -- Not blocked by the user
        AND bu.to_id IS NULL -- User has not blocked the current user
    );
  -- Ensure that the friend request is accepted`;

        // Fetching the messages
        db.query(query, [user_id, user_id, user_id, user_id], (err, results) => {
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
exports.getgallery = async(req, res) => {
    const { user_id } = req.body;
    try {
        // Ensure user_id and to_id are provided
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Query to fetch chat messages between user_id and to_id
        const query = `
      SELECT g.*, u.username,u.profile_type,u.gender
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ? And u.id = ?  ORDER BY g.id DESC; `;

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
        "SELECT COUNT(*) as count FROM gallery WHERE slug = ?", [slug],
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
                        "SELECT COUNT(*) as count FROM gallery WHERE slug = ?", [newSlug],
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

exports.gallerysave = async(req, res) => {
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
    const galleryImage = req.file ?.location || null;

    const wss = req.wss;
    try {
        // Create Date objects and validate

        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");
        var mp = req.body.makeImageUse;
        mp = mp === true || mp === "true" ? 1 : 0;

        // Generate a unique slug for the event name
        createUniqueSlug(name, (err, slug) => {
            if (err) {
                console.error("Slug generation error:", err); // Log error to console
                return res
                    .status(500)
                    .json({ message: "Slug generation error", error: err });
            }

            if (mp === 1) {
                db.query(
                    "UPDATE gallery SET makeImageUse = 0 WHERE user_id = ?", [user_id],
                    (err) => {
                        if (err) {
                            console.error("Database update error:", err); // Log error to console
                            return res
                                .status(500)
                                .json({ message: "Database update error", error: err });
                        }
                        db.query(
                            "UPDATE users SET profile_image = ? WHERE id = ?", [galleryImage, user_id],
                            (err) => {
                                if (err) {
                                    console.error("Database update error:", err); // Log error to console
                                    return res
                                        .status(500)
                                        .json({ message: "Database update error", error: err });
                                }

                                // Proceed to insert the new gallery record after updating
                                db.query(
                                    "INSERT INTO gallery (makeImageUse,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)", [mp, slug, galleryImage, user_id, name, description, date],
                                    (err, result) => {
                                        if (err) {
                                            console.error("Database insertion error:", err); // Log error to console
                                            return res.status(500).json({
                                                message: "Database insertion error",
                                                error: err,
                                            });
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
                                            console.log("dddd");
                                            console.log(results);
                                            const broadcastMessage = JSON.stringify({
                                                event: "gallerynotification",
                                                user_id: results,
                                                LoginData: results,
                                            });
                                            // console.log(wss);
                                            if (wss) {
                                                wss.clients.forEach((client) => {
                                                    if (client.readyState === WebSocket.OPEN) {
                                                        console.log(client.to_id);

                                                        client.send(broadcastMessage);
                                                    }
                                                });
                                            }
                                            res.status(201).json({
                                                message: "Gallery1 created successfully",
                                                galleryId: result.insertId,
                                                user_id: user_id,
                                                slug: slug, // Return the generated slug
                                            });

                                            results.forEach((item) => {
                                                const user_id = item.id; // Use `id` from the results array

                                                db.query(
                                                    "INSERT INTO notification (user_id, message, date) VALUES (?, ?, ?)", [user_id, " posted a new photo", date],
                                                    (err, result) => {
                                                        if (err) {
                                                            console.error(
                                                                "Database insertion error for user_id:",
                                                                user_id,
                                                                err
                                                            );
                                                        } else {
                                                            console.log(
                                                                "Successfully inserted notification for user_id:",
                                                                user_id
                                                            );
                                                        }
                                                    }
                                                );
                                            });
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            } else {
                db.query(
                    "INSERT INTO gallery (makeImageUse,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)", [mp, slug, galleryImage, user_id, name, description, date],
                    (err, result) => {
                        if (err) {
                            console.error("Database insertion error:", err); // Log error to console
                            return res
                                .status(500)
                                .json({ message: "Database insertion error", error: err });
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
                            console.log("dddd");
                            console.log(results);
                            const broadcastMessage = JSON.stringify({
                                event: "gallerynotification",
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
                            res.status(200).json({
                                message: "Gallery created successfully",
                                galleryId: result.insertId,
                                user_id: user_id,
                                slug: slug, // Return the generated slug
                            });

                            results.forEach((item) => {
                                const user_id = item.id; // Use `id` from the results array

                                db.query(
                                    "INSERT INTO notification (user_id, message, date) VALUES (?, ?, ?)", [user_id, " posted a new photo", date],
                                    (err, result) => {
                                        if (err) {
                                            console.error(
                                                "Database insertion error for user_id:",
                                                user_id,
                                                err
                                            );
                                        } else {
                                            console.log(
                                                "Successfully inserted notification for user_id:",
                                                user_id
                                            );
                                        }
                                    }
                                );
                            });
                        });
                    }
                );
            }
            // Insert the event data including the slug
        });
    } catch (error) {
        console.error("Event creation error:", error); // Log error to console
        res.status(500).json({ message: "Event creation error", error });
    }
};

exports.getGalleryDetail = async(req, res) => {
    const { id, user_id } = req.body;
    try {
        // Ensure user_id and to_id are provided
        if (!id) {
            return res.status(400).json({ message: "ID is required" });
        }

        // Query to fetch chat messages between user_id and to_id
        const query = `
     SELECT g.*, 
       u.username, 
       u.profile_type, 
       u.gender, 
       u.profile_image,
       COUNT(gf.id) AS total_favourites,
       CASE 
         WHEN EXISTS (
           SELECT 1 
           FROM gallery_favourite gf2 
           WHERE gf2.gallery_id = g.id AND gf2.user_id = ?
         ) THEN 1
         ELSE 0
       END AS user_favourited
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN gallery_favourite gf ON g.id = gf.gallery_id
      WHERE g.id = ?
      GROUP BY g.id, u.username, u.profile_type, u.gender, u.profile_image;
;
      `;

        // Fetching the messages
        db.query(query, [user_id, id], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Sending the chat messages in the response
            return res.status(200).json({ row });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.getUserDetail = async(req, res) => {
    const { user_id } = req.body;
    try {
        // Ensure user_id and to_id are provided
        if (!user_id) {
            return res.status(400).json({ message: "ID is required" });
        }

        // Query to fetch chat messages between user_id and to_id
        const query = `
      SELECT * from users where id=?`;

        // Fetching the messages
        db.query(query, [user_id], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Sending the chat messages in the response
            return res.status(200).json({ row });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.galleryPostLike = async(req, res) => {
    const { id, user_id } = req.body;
    const wss = req.wss;

    // Validate required fields
    if (!id || !user_id) {
        return res.status(400).json({ message: "ID and User ID are required." });
    }

    try {
        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");

        // Check if the entry already exists
        const checkExistsQuery = `SELECT * FROM gallery_favourite WHERE user_id = ? AND gallery_id = ?`;
        db.query(checkExistsQuery, [user_id, id], (err, row) => {
            if (err) {
                console.error("Database query error:", err);
                return res
                    .status(500)
                    .json({ message: "Database query error", error: err });
            }

            if (row.length > 0) {
                // If exists, update the existing record by deleting it
                const deleteQuery = `DELETE FROM gallery_favourite WHERE user_id = ? AND gallery_id = ?`;
                db.query(deleteQuery, [user_id, id], (deleteErr) => {
                    if (deleteErr) {
                        console.error("Database delete error:", deleteErr);
                        return res
                            .status(500)
                            .json({ message: "Database delete error", error: deleteErr });
                    }
                    // Broadcast the unliking event
                    handleBroadcast(user_id, id, wss, date, res);
                });
            } else {
                // If not exists, insert a new record
                const insertQuery = `INSERT INTO gallery_favourite (gallery_id, user_id, date) VALUES (?, ?, ?)`;
                db.query(insertQuery, [id, user_id, date], (insertErr) => {
                    if (insertErr) {
                        console.error("Database insert error:", insertErr);
                        return res
                            .status(500)
                            .json({ message: "Database insert error", error: insertErr });
                    }
                    // Broadcast the liking event
                    handleBroadcast(user_id, id, wss, date, res);
                });
            }
        });
    } catch (error) {
        console.error("Event retrieval error:", error); // Log error to console
        res.status(500).json({ message: "Event retrieval error", error });
    }
};

// Function to handle broadcasting of like/unlike events
function handleBroadcast(user_id, id, wss, date, res) {
    const userQuery = `SELECT g.*, 
    u.username, 
    u.profile_image,
    COUNT(gf.id) AS total_favourites,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM gallery_favourite gf2 
        WHERE gf2.gallery_id = g.id AND gf2.user_id = ?
      ) THEN 1
      ELSE 0
    END AS user_favourited
    FROM gallery g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN gallery_favourite gf ON g.id = gf.gallery_id
    WHERE g.id = ?
    GROUP BY g.id, u.username, u.profile_image`;

    db.query(userQuery, [user_id, id], (err, userResult) => {
        if (err || userResult.length === 0) {
            return res
                .status(500)
                .json({ message: "User not found or query error", error: err });
        }

        const {
            username,
            profile_image,
            description,
            user_favourited,
            total_favourites,
        } = userResult[0];

        // Create the broadcast message
        const broadcastMessage = JSON.stringify({
            event: "GalleryLike",
            user_favourited: user_favourited,
            user_id: user_id,
            total_favourites: total_favourites,
            gallery_id: id,
            description: description,
            username: username, // Include username
            date: date, // Use the current date
            profile_image: profile_image, // Include profile image URL
        });

        // Ensure that wss exists and is broadcasting
        if (wss) {
            try {
                console.log("Broadcasting message to clients...");
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(broadcastMessage);
                    }
                });
                console.log("Message broadcasted successfully.");
            } catch (error) {
                console.error("WebSocket broadcast error:", error);
            }
        } else {
            console.log("WebSocket Server not attached");
        }

        res.status(201).json({
            message: "Gallery Favourite created successfully.",
            status: "1",
        });
    });
}

exports.getGalleryComments = async(req, res) => {
    const { id, user_id } = req.body;
    console.log(req.body);
    // Validate required fields
    if (!id || !user_id) {
        return res.status(400).json({ message: "ID and User ID are required." });
    }

    try {
        // Check if the entry already exists

        const query = `
      SELECT gc.*, 
       u.username, 
       u.profile_image
      FROM gallery_comment gc
      JOIN users u ON gc.user_id = u.id
      WHERE gc.gallery_id = ?;
    `;

        // Fetching the messages
        db.query(query, [id], (err, results) => {
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
        console.error("Event retrieval error:", error); // Log error to console
        res.status(500).json({ message: "Event retrieval error", error });
    }
};

exports.GalleryPostSave = async(req, res) => {
    const { description, gallery_id, user_id } = req.body;
    const wss = req.wss;

    try {
        if (!gallery_id || !user_id) {
            return res
                .status(400)
                .json({ message: "Gallery ID and User ID are required" });
        }

        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");

        const insertQuery = `INSERT INTO gallery_comment (gallery_id, user_id, description, date) VALUES (?, ?, ?, ?)`;

        db.query(
            insertQuery, [gallery_id, user_id, description, date],
            (err, result) => {
                if (err) {
                    return res
                        .status(500)
                        .json({ message: "Database insertion error", error: err });
                }

                const lastInsertId = result.insertId;

                // Fetch user details to include in the broadcast message
                const userQuery = `SELECT username, profile_image FROM users WHERE id = ?`;

                db.query(userQuery, [user_id], (err, userResult) => {
                    if (err || userResult.length === 0) {
                        return res
                            .status(500)
                            .json({ message: "User not found or query error", error: err });
                    }

                    const { username, profile_image } = userResult[0];

                    const broadcastMessage = JSON.stringify({
                        event: "GalleryPost",
                        user_id: user_id,
                        gallery_id: gallery_id,
                        username: username, // Include username
                        message: description,
                        date: date, // Include date
                        profile_image: profile_image, // Include profile image URL
                        lastInsertId: lastInsertId, // Include the last insert ID
                    });

                    // Ensure that wss exists and is broadcasting
                    if (wss) {
                        try {
                            console.log("Broadcasting message to clients...");
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(broadcastMessage);
                                }
                            });
                            console.log("Message broadcasted successfully.");
                        } catch (error) {
                            console.error("WebSocket broadcast error:", error);
                        }
                    } else {
                        console.log("WebSocket Server not attached");
                    }

                    return res.status(201).json({
                        message: "Comment added successfully",
                        commentId: result.insertId,
                    });
                });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.getgallerySearch = async(req, res) => {
    const { user_id, search } = req.body;

    try {
        // Ensure user_id is provided
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Prepare search terms with wildcards for partial matching
        const searchTerm = search ? `%${search}%` : "%"; // If no search term is provided, match all

        // Query to fetch gallery items based on user_id and search terms
        const query = `
      SELECT g.*, u.username, u.profile_type, u.gender
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ?
      AND (g.name LIKE ? OR g.description LIKE ? OR u.username LIKE ?)
      ORDER BY g.id DESC;`;

        // Fetching the gallery items
        db.query(
            query, [user_id, searchTerm, searchTerm, searchTerm],
            (err, results) => {
                if (err) {
                    return res.status(500).json({
                        message: "Database query error",
                        error: err,
                    });
                }

                // Sending the results in the response
                return res.status(200).json({ results });
            }
        );
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getAllgallerySearch = async(req, res) => {
    const { user_ids, search } = req.body; // Expecting a string of user IDs

    try {
        // Ensure user_ids is provided
        if (!user_ids) {
            return res.status(400).json({ message: "User IDs are required" });
        }

        // Prepare search term with wildcards for partial matching
        const searchTerm = search ? `%${search}%` : "%"; // Match all if no search term is provided

        // Prepare SQL query to fetch galleries for multiple user IDs
        const query = `
      SELECT g.*, u.username, u.profile_type, u.gender
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (${user_ids})  -- Use IN clause to filter by multiple user IDs
      AND (g.name LIKE ? OR g.description LIKE ? OR u.username LIKE ?)  -- Search filter
      ORDER BY g.id DESC;
    `;

        // Fetching the galleries
        db.query(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Sending the gallery data in the response
            return res.status(200).json({ results });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.searchfilter = async(req, res) => {
    const { user_ids, search } = req.body; // Expecting a string of user IDs and search term
    console.log(user_ids);

    try {
        // Ensure user_ids is provided
        if (!user_ids || user_ids.length === 0) {
            return res.status(400).json({ message: "User IDs are required" });
        }

        // Predefined categories with associated values
        const categories = {
            couple: [
                "fullswap",
                "voyeur",
                "hotwife",
                "softswap",
                "cuckold",
                "exhibitionist",
            ],
            female: ["straight", "bi-sexual", "bi-curious", "lesbian", "hotwife"],
            male: ["straight", "bi-sexual", "bi-curious", "gay", "bull"],
        };

        // Prepare base query
        let query = `
      SELECT g.*, u.username, u.gender, u.female, u.male, u.couple
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (?) 
    `;
        const params = [user_ids]; // User IDs to be injected into the query

        // Handle search filter
        if (search) {
            const lowerSearch = search.toLowerCase();

            // If search is for "couple" and we have values to match in the "couple" category
            if (lowerSearch === "couple") {
                const coupleSearchConditions = categories.couple
                    .map((value) => {
                        return `JSON_CONTAINS(u.couple, JSON_ARRAY(?)) OR u.couple LIKE ?`;
                    })
                    .join(" OR ");
                query += ` AND (${coupleSearchConditions}) `;
                params.push(
                    ...categories.couple.map((value) => [value, `%${value}%`]).flat()
                );
            }
            // If search is for "men" and we have values to match in the "male" category
            else if (lowerSearch === "men") {
                const maleSearchConditions = categories.male
                    .map((value) => {
                        return `JSON_CONTAINS(u.male, JSON_ARRAY(?)) OR u.male LIKE ?`;
                    })
                    .join(" OR ");
                query += ` AND (${maleSearchConditions}) `;
                params.push(
                    ...categories.male.map((value) => [value, `%${value}%`]).flat()
                );
            }
            // If search is for "women" and we have values to match in the "female" category
            else if (lowerSearch === "women") {
                const femaleSearchConditions = categories.female
                    .map((value) => {
                        return `JSON_CONTAINS(u.female, JSON_ARRAY(?)) OR u.female LIKE ?`;
                    })
                    .join(" OR ");
                query += ` AND (${femaleSearchConditions}) `;
                params.push(
                    ...categories.female.map((value) => [value, `%${value}%`]).flat()
                );
            }
        }

        // Add ordering
        query += ` ORDER BY g.id DESC; `;
        console.log(query);
        console.log(params);

        // Execute the query
        db.query(query, params, (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Send the results
            return res.status(200).json({ results });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.requestToview = async(req, res) => {
    const { user_id, to_id } = req.body;
    //console.log(req.body);

    const wss = req.wss; // Get the WebSocket server instance from the request

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        // Prepare the current date
        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");

        // Insert the message along with file URLs into a single database row
        // First, check if the record exists
        db.query(
            "SELECT * FROM userphotoPrivate WHERE user_id = ? AND to_id = ?", [user_id, to_id],
            (selectErr, selectResults) => {
                if (selectErr) {
                    return res.status(500).json({
                        message: "Database select error",
                        error: selectErr,
                    });
                }
                console.log(selectResults);
                // If the record exists, return status "2"
                if (selectResults.length > 0) {
                    if (selectResults[0].status === "No") {
                        return res.status(200).json({
                            user_id: user_id,
                            to_id: to_id,
                            status: "2",
                        });
                    }
                    if (selectResults[0].status === "Yes") {
                        return res.status(200).json({
                            user_id: user_id,
                            to_id: to_id,
                            status: "3",
                        });
                    }
                } else {
                    // If no record exists, proceed to insert
                    const date = new Date(); // Ensure you set the date correctly
                    db.query(
                        "INSERT INTO userphotoPrivate (user_id, to_id, status, date) VALUES (?, ?, ?, ?)", [user_id, to_id, "No", date],
                        (insertErr, result) => {
                            if (insertErr) {
                                return res.status(500).json({
                                    message: "Database insert error",
                                    error: insertErr,
                                    status: "",
                                });
                            }

                            const lastInsertId = result.insertId;

                            // Broadcast the message to WebSocket clients
                            const broadcastMessage = JSON.stringify({
                                event: "Requestview",
                                user_id: user_id,
                                to_id: to_id,
                                lastInsertId: lastInsertId,
                            });

                            if (wss) {
                                wss.clients.forEach((client) => {
                                    if (client.readyState === WebSocket.OPEN) {
                                        console.log(client.to_id);
                                        client.send(broadcastMessage);
                                    }
                                });
                            }

                            // Return success response
                            res.status(200).json({
                                user_id: user_id,
                                to_id: to_id,
                                status: "1",
                            });
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.RequestConfirm = async(req, res) => {
    const { req_id, to_id, user_id } = req.body;
    //console.log(req.body);

    const wss = req.wss; // Get the WebSocket server instance from the request

    try {
        // Ensure user_id and to_id are provided
        if (!req_id) {
            return res.status(400).json({ message: "Both Id id required" });
        }

        // Prepare the current date

        db.query(
            "UPDATE userphotoPrivate SET status = ? WHERE id = ?", ["Yes", req_id],
            (updateErr, result) => {
                if (updateErr) {
                    return res.status(500).json({
                        message: "Database update error",
                        error: updateErr,
                    });
                }

                // Check if any rows were affected (i.e., if the update was successful)
                if (result.affectedRows === 0) {
                    return res
                        .status(404)
                        .json({ message: "No record found with this ID." });
                }

                const broadcastMessage = JSON.stringify({
                    event: "Requestconfirm",
                    to_id: to_id,
                    user_id: user_id,
                });

                if (wss) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            console.log(client.to_id);
                            client.send(broadcastMessage);
                        }
                    });
                }

                // Return success response
                res.status(200).json({
                    message: "Record updated successfully.",
                    to_id: to_id,
                    user_id: user_id,
                });
            }
        );
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.Requestdelete = async(req, res) => {
    const { req_id, to_id, user_id } = req.body;
    //console.log(req.body);

    const wss = req.wss; // Get the WebSocket server instance from the request

    try {
        // Ensure user_id and to_id are provided
        if (!req_id) {
            return res.status(400).json({ message: "Both Id id required" });
        }

        // Prepare the current date

        db.query(
            "DELETE FROM userphotoPrivate WHERE id = ?", [req_id],
            (deleteErr, result) => {
                if (deleteErr) {
                    return res.status(500).json({
                        message: "Database delete error",
                        error: deleteErr,
                    });
                }

                // Check if any rows were affected (i.e., if the delete was successful)
                if (result.affectedRows === 0) {
                    return res
                        .status(404)
                        .json({ message: "No record found with this ID." });
                }
                const broadcastMessage = JSON.stringify({
                    event: "Requestconfirm",
                    to_id: to_id,
                    user_id: user_id,
                });

                if (wss) {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            console.log(client.to_id);
                            client.send(broadcastMessage);
                        }
                    });
                }
                // Return success response
                res.status(200).json({
                    message: "Record deleted successfully.",
                    to_id: to_id,
                    user_id: user_id,
                });
            }
        );
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.visitprofile = async(req, res) => {
    const { user_id, to_id } = req.body;
    //console.log(req.body);

    const wss = req.wss; // Get the WebSocket server instance from the request

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        // Prepare the current date
        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");

        // Insert the message along with file URLs into a single database row
        // First, check if the record exists
        db.query(
            "SELECT * FROM profile_visit WHERE user_id = ? AND to_id = ?", [user_id, to_id],
            (selectErr, selectResults) => {
                if (selectErr) {
                    return res.status(500).json({
                        message: "Database select error",
                        error: selectErr,
                    });
                }

                if (selectResults.length > 0) {} else {
                    // If no record exists, proceed to insert
                    const date = new Date(); // Ensure you set the date correctly
                    db.query(
                        "INSERT INTO profile_visit (user_id, to_id, date) VALUES (?, ?, ?)", [user_id, to_id, date],
                        (insertErr, result) => {
                            if (insertErr) {
                                return res.status(500).json({
                                    message: "Database insert error",
                                    error: insertErr,
                                    status: "",
                                });
                            }

                            // Return success response
                            res.status(200).json({
                                user_id: user_id,
                                to_id: to_id,
                                status: "1",
                            });
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.forumscommentSave = async(req, res) => {
    const { user_id, forum_id, description, message } = req.body;
    //console.log(req.body);

    const wss = req.wss; // Get the WebSocket server instance from the request

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !forum_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and forum_id are required" });
        }

        // Prepare the current date
        const date = moment
            .tz(new Date(), "Europe/Oslo")
            .format("YYYY-MM-DD HH:mm:ss");

        // Prepare data to save into the database
        const data = {
            user_id: user_id,
            forum_id: forum_id,
            description: description, // Insert the message
            date: date,
        };

        // Insert the message along with file URLs into a single database row
        db.query(
            "INSERT INTO forum_comment (user_id, forum_id, description, date) VALUES (?, ?, ?, ?)", [data.user_id, data.forum_id, data.description, data.date],
            (insertErr, result) => {
                if (insertErr) {
                    // console.error("Database insert error:", insertErr);
                    return res.status(500).json({
                        message: "Database insert error",
                        error: insertErr,
                        status: "",
                    });
                }
                const lastInsertId = result.insertId;
                db.query(
                    `SELECT fc.*, u.profile_image, u.username
            FROM forum_comment fc
            JOIN users u ON fc.user_id = u.id
            WHERE fc.id = ?`, [lastInsertId],
                    (err, row) => {
                        if (err) {
                            console.error("Database query error:", err);
                            return res.status(500).json({
                                message: "Database query error",
                                error: err,
                                event: "",
                            });
                        }
                        var rr = row[0];
                        const broadcastMessage = JSON.stringify({
                            event: "ForumComments",
                            user_id: user_id,
                            forum_id: forum_id,
                            profile_image: rr.profile_image,
                            username: rr.username,
                            description: rr.description,
                            date: rr.date,
                            id: lastInsertId,
                        });

                        if (wss) {
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    console.log(client.to_id);

                                    client.send(broadcastMessage);
                                }
                            });
                        }

                        // Return success response
                        res.status(200).json({
                            message: message,
                            user_id: user_id,
                            status: "1",
                        });
                    }
                );
                // Broadcast the message to WebSocket clients
            }
        );
    } catch (error) {
        console.error("Error:", error); // Log the error for debugging
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.getdashboardpost = async(req, res) => {
    const { user_ids, user_id } = req.body; // Expecting an array or string of user IDs

    try {
        // Ensure user_ids and user_id are provided
        if (!user_ids || !user_id) {
            return res
                .status(400)
                .json({ message: "User IDs and User ID are required" });
        }

        // If user_ids is a comma-separated string, convert it into an array
        const userIdsArray = Array.isArray(user_ids) ?
            user_ids :
            user_ids.split(",").map((id) => id.trim());

        // Generate placeholders for the IN clause
        const placeholders = userIdsArray.map(() => "?").join(",");

        // Prepare SQL query to fetch galleries for multiple user IDs
        const query = `
      SELECT g.*, u.username, u.profile_type, u.gender, u.profile_image as uimage
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (${placeholders}) AND g.user_id != ?
      ORDER BY g.id DESC;
    `;

        // Combine the user IDs and user_id into the query parameters array
        const queryParams = [...userIdsArray, user_id];
        console.log(queryParams);
        // Fetching the galleries using parameterized query
        db.query(query, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Sending the gallery data in the response
            return res.status(200).json({ results });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.messageseen = async(req, res) => {
    const { to_id, id, user_id } = req.body; // Expecting message ID and user ID
    const wss = req.wss; // Get the WebSocket server instance from the request
    console.log(req.body);
    try {
        // Ensure both ID and User ID are provided
        if (!id || !user_id) {
            return res.status(400).json({ message: "ID and User ID are required" });
        }

        // First, check if the message with the provided ID exists and if the to_id matches the user_id
        db.query(
            "SELECT * FROM chatmessages WHERE id = ? AND to_id = ?", [id, user_id],
            (selectErr, selectResults) => {
                if (selectErr) {
                    console.error("Database select error:", selectErr); // Log select query error
                    return res.status(500).json({
                        message: "Database select error",
                        error: selectErr,
                        status: "2",
                    });
                }

                // Check if the message exists
                if (selectResults.length === 0) {
                    return res.status(404).json({
                        message: "Message not found or incorrect user ID",
                        status: "2",
                    });
                }

                // Message exists, proceed with the update
                db.query(
                    "UPDATE chatmessages SET `read` = 'Yes' WHERE id = ? AND to_id = ?", [id, user_id],
                    (updateErr) => {
                        if (updateErr) {
                            console.error("Database update error:", updateErr); // Log update query error
                            return res.status(500).json({
                                message: "Database update error",
                                error: updateErr,
                                status: "2",
                            });
                        }
                        const broadcastMessage = JSON.stringify({
                            event: "MessageseenScroll",
                            user_id: user_id,
                            to_id: to_id,
                        });

                        if (wss) {
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    console.log(client.to_id);

                                    client.send(broadcastMessage);
                                }
                            });
                        }
                        return res.status(200).json({ status: "1" });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Server error:", error); // Log server-side errors
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.membersearch = async(req, res) => {
    var user_id = req.body.user_id;
    var search = req.body.search;
    console.log(user_id);

    try {
        // Ensure search term is provided
        const searchTerm = `%${search}%`; // Using '%' for LIKE search

        // Prepare the SQL query string
        const query = `
      SELECT 
        u.*, 
        CASE 
            WHEN fr.status = 'Yes' THEN true 
            ELSE false 
        END AS is_friend,
        fr.status AS friend_status
      FROM 
        users u
      LEFT JOIN 
        friendRequest_accept fr 
        ON (u.id = fr.sent_to AND fr.user_id = ?) 
        OR (u.id = fr.user_id AND fr.sent_to = ?)
      WHERE 
        u.id != ? 
        AND (
          u.email LIKE ? OR
          u.location LIKE ? OR
          u.town LIKE ? OR
          u.birthday_date LIKE ? OR
          u.looking_for LIKE ? OR
          u.username LIKE ? OR
          u.nationality LIKE ? OR
          u.sexual_orientation LIKE ? OR
          u.relationship_status LIKE ? OR
          u.search_looking_for LIKE ? OR
          u.degree LIKE ? OR
          u.drinker LIKE ? OR
          u.smoker LIKE ? OR
          u.tattos LIKE ? OR
          u.body_piercings LIKE ? OR
          u.fetish LIKE ? OR
          u.connectwith LIKE ? OR
          u.interstedin LIKE ? OR
          u.male LIKE ? OR
          u.couple LIKE ? OR
          u.female LIKE ?
        )
    `;

        // Prepare the parameters for the query
        const params = [
            user_id, // user_id for friendRequest_accept
            user_id, // user_id for friendRequest_accept
            user_id, // Exclude current user
            searchTerm, // For u.email
            searchTerm, // For u.location
            searchTerm, // For u.town
            searchTerm, // For u.birthday_date
            searchTerm, // For u.looking_for
            searchTerm, // For u.username
            searchTerm, // For u.nationality
            searchTerm, // For u.sexual_orientation
            searchTerm, // For u.relationship_status
            searchTerm, // For u.search_looking_for
            searchTerm, // For u.degree
            searchTerm, // For u.drinker
            searchTerm, // For u.smoker
            searchTerm, // For u.tattos
            searchTerm, // For u.body_piercings
            searchTerm, // For u.fetish
            searchTerm, // For u.connectwith
            searchTerm, // For u.interstedin
            searchTerm, // For u.male
            searchTerm, // For u.couple
            searchTerm, // For u.female
        ];

        // Log the query and the parameters to see the final query being executed
        console.log("Executing query:");
        console.log(query);
        console.log("With parameters:");
        console.log(params);

        // SQL query with LIKE for multiple columns
        db.query(query, params, (err, row) => {
            if (err) {
                return res.status(500).json({ message: "Database error", error: err });
            }
            return res.status(200).json({ results: row });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

exports.areafilter = async(req, res) => {
    var user_id = req.body.user_id;

    var search = req.body.age;

    try {
        // Ensure search term is provided
        // Using '%' for LIKE search
        const location = req.body.location;
        const sexual_orientation = req.body.sexual_orientation;
        const birthday = search;
        console.log(req.body);
        console.log(location.length);
        console.log(sexual_orientation.length);
        console.log(birthday.length);

        // Initialize conditions and parameters
        let conditions = [];
        let params = [user_id, user_id, user_id]; // Start with user_id for exclusions and joins

        if (
            location.length === 0 &&
            birthday.length === 0 &&
            sexual_orientation.length === 0
        ) {
            try {
                // Ensure the email is provided

                // Query the database to get the user's profile details
                db.query(
                    `SELECT 
                u.*, 
                CASE 
                    WHEN fr.status = 'Yes' THEN true 
                    ELSE false 
                END AS is_friend,
                fr.status AS friend_status
            FROM 
                users u
            LEFT JOIN 
                friendRequest_accept fr 
                ON (u.id = fr.sent_to AND fr.user_id = ?) 
                OR (u.id = fr.user_id AND fr.sent_to = ?)
            WHERE 
                u.id != ?;
        `, [user_id, user_id, user_id],
                    (err, row) => {
                        console.log(row);
                        return res.status(200).json({ results: row });
                    }
                );
            } catch (error) {
                res.status(500).json({ message: "Server error", error });
            }
        } else {
            // Dynamically build the location condition if provided
            if (location && location.length > 0) {
                const locationConditions = location
                    .map((loc) => `u.location LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${locationConditions})`);
                params.push(...location.map((loc) => `%${loc}%`)); // Add location parameters
            }

            // Dynamically build the birthday condition if provided
            if (birthday && birthday.length > 0) {
                const birthdayConditions = birthday
                    .map((bday) => `u.birthday_date LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${birthdayConditions})`);
                params.push(...birthday.map((bday) => `%${bday}%`)); // Add birthday parameters
            }

            // Dynamically build the sexual_orientation condition if provided
            if (sexual_orientation && sexual_orientation.length > 0) {
                const sexualOrientationCondition = sexual_orientation
                    .map((so) => `u.sexual_orientation LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${sexualOrientationCondition})`);
                params.push(...sexual_orientation.map((so) => `%${so}%`)); // Add sexual_orientation parameters
            }

            // Combine all conditions for the query
            let whereClause =
                conditions.length > 0 ? `AND (${conditions.join(" AND ")})` : "";

            const query = `
          SELECT 
            u.*, 
            CASE 
              WHEN fr.status = 'Yes' THEN true 
              ELSE false 
            END AS is_friend,
            fr.status AS friend_status
          FROM 
            users u
          LEFT JOIN 
            friendRequest_accept fr 
          ON 
            (u.id = fr.sent_to AND fr.user_id = ?) 
            OR (u.id = fr.user_id AND fr.sent_to = ?)
          WHERE 
            u.id != ? 
            ${whereClause}
        `;
            db.query(query, params, (err, row) => {
                if (err) {
                    return res
                        .status(500)
                        .json({ message: "Database error", error: err });
                }
                return res.status(200).json({ results: row });
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
exports.agefilter = async(req, res) => {
    var user_id = req.body.user_id;

    var search = req.body.age;
    // console.log(search.length);

    try {
        // Ensure search term is provided
        // Using '%' for LIKE search
        const location = req.body.location;
        const sexual_orientation = req.body.sexual_orientation;
        const birthday = search;

        // Initialize conditions and parameters
        let conditions = [];
        let params = [user_id, user_id, user_id]; // Start with user_id for exclusions and joins

        if (
            location.length === 0 &&
            birthday.length === 0 &&
            sexual_orientation.length === 0
        ) {
            try {
                // Ensure the email is provided

                // Query the database to get the user's profile details
                db.query(
                    `SELECT 
                u.*, 
                CASE 
                    WHEN fr.status = 'Yes' THEN true 
                    ELSE false 
                END AS is_friend,
                fr.status AS friend_status
            FROM 
                users u
            LEFT JOIN 
                friendRequest_accept fr 
                ON (u.id = fr.sent_to AND fr.user_id = ?) 
                OR (u.id = fr.user_id AND fr.sent_to = ?)
            WHERE 
                u.id != ?;
        `, [user_id, user_id, user_id],
                    (err, row) => {
                        console.log(row);
                        return res.status(200).json({ results: row });
                    }
                );
            } catch (error) {
                res.status(500).json({ message: "Server error", error });
            }
        } else {
            // Dynamically build the location condition if provided
            if (location && location.length > 0) {
                const locationConditions = location
                    .map((loc) => `u.location LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${locationConditions})`);
                params.push(...location.map((loc) => `%${loc}%`)); // Add location parameters
            }

            // Dynamically build the birthday condition if provided
            if (birthday && birthday.length > 0) {
                const birthdayConditions = birthday
                    .map((bday) => `u.birthday_date LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${birthdayConditions})`);
                params.push(...birthday.map((bday) => `%${bday}%`)); // Add birthday parameters
            }

            // Dynamically build the sexual_orientation condition if provided
            if (sexual_orientation && sexual_orientation.length > 0) {
                const sexualOrientationCondition = sexual_orientation
                    .map((so) => `u.sexual_orientation LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${sexualOrientationCondition})`);
                params.push(...sexual_orientation.map((so) => `%${so}%`)); // Add sexual_orientation parameters
            }

            // Combine all conditions for the query
            let whereClause =
                conditions.length > 0 ? `AND (${conditions.join(" AND ")})` : "";

            const query = `
          SELECT 
            u.*, 
            CASE 
              WHEN fr.status = 'Yes' THEN true 
              ELSE false 
            END AS is_friend,
            fr.status AS friend_status
          FROM 
            users u
          LEFT JOIN 
            friendRequest_accept fr 
          ON 
            (u.id = fr.sent_to AND fr.user_id = ?) 
            OR (u.id = fr.user_id AND fr.sent_to = ?)
          WHERE 
            u.id != ? 
            ${whereClause}
        `;
            db.query(query, params, (err, row) => {
                if (err) {
                    return res
                        .status(500)
                        .json({ message: "Database error", error: err });
                }
                return res.status(200).json({ results: row });
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
exports.sexfilter = async(req, res) => {
    var user_id = req.body.user_id;

    var search = req.body.age;
    //console.log(req.body);

    try {
        // Ensure search term is provided
        // Using '%' for LIKE search
        const location = req.body.location;
        const sexual_orientation = req.body.sexual_orientation;
        const birthday = search;

        // Initialize conditions and parameters
        let conditions = [];
        let params = [user_id, user_id, user_id]; // Start with user_id for exclusions and joins

        if (
            location.length === 0 &&
            birthday.length === 0 &&
            sexual_orientation.length === 0
        ) {
            try {
                // Ensure the email is provided

                // Query the database to get the user's profile details
                db.query(
                    `SELECT 
                u.*, 
                CASE 
                    WHEN fr.status = 'Yes' THEN true 
                    ELSE false 
                END AS is_friend,
                fr.status AS friend_status
            FROM 
                users u
            LEFT JOIN 
                friendRequest_accept fr 
                ON (u.id = fr.sent_to AND fr.user_id = ?) 
                OR (u.id = fr.user_id AND fr.sent_to = ?)
            WHERE 
                u.id != ?;
        `, [user_id, user_id, user_id],
                    (err, row) => {
                        console.log(row);
                        return res.status(200).json({ results: row });
                    }
                );
            } catch (error) {
                res.status(500).json({ message: "Server error", error });
            }
        } else {
            // Dynamically build the location condition if provided
            if (location && location.length > 0) {
                const locationConditions = location
                    .map((loc) => `u.location LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${locationConditions})`);
                params.push(...location.map((loc) => `%${loc}%`)); // Add location parameters
            }

            // Dynamically build the birthday condition if provided
            if (birthday && birthday.length > 0) {
                const birthdayConditions = birthday
                    .map((bday) => `u.birthday_date LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${birthdayConditions})`);
                params.push(...birthday.map((bday) => `%${bday}%`)); // Add birthday parameters
            }

            // Dynamically build the sexual_orientation condition if provided
            if (sexual_orientation && sexual_orientation.length > 0) {
                const sexualOrientationCondition = sexual_orientation
                    .map((so) => `u.sexual_orientation LIKE ?`)
                    .join(" OR ");
                conditions.push(`(${sexualOrientationCondition})`);
                params.push(...sexual_orientation.map((so) => `%${so}%`)); // Add sexual_orientation parameters
            }

            // Combine all conditions for the query
            let whereClause =
                conditions.length > 0 ? `AND (${conditions.join(" AND ")})` : "";

            const query = `
          SELECT 
            u.*, 
            CASE 
              WHEN fr.status = 'Yes' THEN true 
              ELSE false 
            END AS is_friend,
            fr.status AS friend_status
          FROM 
            users u
          LEFT JOIN 
            friendRequest_accept fr 
          ON 
            (u.id = fr.sent_to AND fr.user_id = ?) 
            OR (u.id = fr.user_id AND fr.sent_to = ?)
          WHERE 
            u.id != ? 
            ${whereClause}
        `;

            db.query(query, params, (err, row) => {
                if (err) {
                    return res
                        .status(500)
                        .json({ message: "Database error", error: err });
                }
                return res.status(200).json({ results: row });
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

exports.checkmembership = async(req, res) => {
    const { user_id } = req.body; // Expecting an array or string of user IDs

    try {
        // Ensure user_ids and user_id are provided
        if (!user_id) {
            return res.status(400).json({ message: " User ID are required" });
        }

        const query = `
      SELECT membership.*, users.status
      FROM membership
      JOIN users ON users.id = membership.user_id
      WHERE membership.user_id = ?
      ;
    `;

        db.query(query, user_id, (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }
            console.log("d");
            if (row.length > 0) {
                console.log(row[0].end_date);
                const currentDate = moment
                    .tz(new Date(), "Europe/Oslo")
                    .format("YYYY-MM-DD");
                // Get the end_date from the row (assuming it's in a valid date format)
                const endDate = moment(row[0].end_date)
                    .tz("Europe/Oslo")
                    .format("YYYY-MM-DD");

                console.log("Current Date:", currentDate);
                console.log("End Date:", endDate);

                // Check if the current date is after the end_date
                const isExpired = moment(currentDate).isAfter(endDate);

                return res.status(200).json({ status: isExpired, result: row });
            }
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.userblock = async(req, res) => {
    const { user_id, sent_id } = req.body; // Expecting an array or string of user IDs

    try {
        // Ensure user_ids and user_id are provided
        if (!user_id) {
            return res.status(400).json({ message: " User ID are required" });
        }

        const query = `
    INSERT INTO blockuser (user_id, to_id) 
    VALUES (?, ?)
  `;

        // Assuming you're using a query function from a database library
        db.query(query, [user_id, sent_id]);

        return res.status(200).json({ message: "User successfully blocked" });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.getcheckuserblock = async(req, res) => {
    const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        const query = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ?
    `;

        // Pass both user_id and to_id as an array to the query function
        db.query(query, [to_id, user_id], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // If a block relationship exists, return the data
            return res.status(200).json({ message: "User is blocked", result: row });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.getcheckuserblockend = async(req, res) => {
    const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        const query = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ?
    `;

        // Pass both user_id and to_id as an array to the query function
        db.query(query, [user_id, to_id], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // If a block relationship exists, return the data
            return res.status(200).json({ message: "User is blocked", result: row });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};
exports.userunblock = async(req, res) => {
    const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        // Step 1: Check if a block relationship exists
        const queryCheckBlock = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ?
    `;

        // Pass both user_id and to_id as an array to the query function
        db.query(queryCheckBlock, [user_id, to_id], (err, rows) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // If no block exists, return a message saying so
            if (rows.length === 0) {
                return res.status(404).json({ message: "No block relationship found" });
            }

            // Step 2: If a block relationship exists, proceed to delete the record
            const queryDeleteBlock = `
        DELETE FROM blockuser WHERE user_id = ? AND to_id = ?
      `;

            db.query(queryDeleteBlock, [user_id, to_id], (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: "Failed to unblock user",
                        error: err,
                    });
                }

                // If deletion is successful, return a success message
                return res.status(200).json({ message: "User successfully unblocked" });
            });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

exports.checkuserblock = async(req, res) => {
    const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

    try {
        // Ensure user_id and to_id are provided
        if (!user_id || !to_id) {
            return res
                .status(400)
                .json({ message: "Both user_id and to_id are required" });
        }

        const query = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ? or user_id =? And to_id=?
    `;

        // Pass both user_id and to_id as an array to the query function
        db.query(query, [user_id, to_id, to_id, user_id], (err, row) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // If a block relationship exists, return the data
            return res.status(200).json({ message: "User is blocked", result: row });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};


  exports.create_payment_intent = async(req, res) => {
    console.log(req.body)
    try {
        const { amount } = req.body;
    
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        return res.status(200).json({clientSecret: paymentIntent.client_secret });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
          return res.status(200).json({ error: error.message,clientSecret:'' });
      }
  }

exports.galleryfilter = async (req, res) => {
    const { user_id, search } = req.body;

    try {
        // Ensure user_id is provided
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Prepare search term with wildcards for partial matching (search term can be for name, description, or username)
        const searchTerm = search ? `%${search}%` : "%"; // If no search term is provided, match all

        // Prepare gender filter condition and query parameters
        let genderCondition = "";
        const queryParams = [user_id]; // Params for search fields

        // Gender-based filtering for different fields (male, female, couple)
        if (search === 'male') {
            genderCondition = "AND u.male != 1"; // Filter by male field
        } else if (search === 'female') {
            genderCondition = "AND u.female = 1"; // Filter by female field
        } else if (search === 'couple') {
            genderCondition = "AND u.couple = 1"; // Filter by couple field
        }

        // Query to fetch gallery items based on user_id, search terms, and optional gender filter
        const query = `
            SELECT g.*, u.username, u.profile_type, u.gender
            FROM gallery g
            JOIN users u ON g.user_id = u.id
            WHERE g.user_id = ?
            ${genderCondition}  // Only applies if gender is specified
            ORDER BY g.id DESC;
        `;

        // Fetching the gallery items
        db.query(query, queryParams, (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Database query error",
                    error: err,
                });
            }

            // Sending the results in the response
            return res.status(200).json({ results });
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};


exports.getonlineuser = async (req, res) => {
    const { user_ids, user_id } = req.body; // Expecting user IDs array and current user ID
    const wss = req.wss; // Get the WebSocket server instance from the request
    console.log(req.body);
    try {
        // Validate input
        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(200).json({ message: "Invalid user_ids. It must be a non-empty array." });
        }
        if (!user_id) {
            return res.status(200).json({ message: "Missing user_id in request body." });
        }

        // Define the query
        const query = `
          SELECT * FROM users 
          WHERE id IN (?) 
          AND online_user = ? 
          AND id != ?
        `;

        // Execute the query
        db.query(query, [user_ids, 'Online', user_id], (err, results) => {
            if (err) {
                console.error("Database query error:", err); // Log the error
                return res.status(500).json({
                    message: "Database query error",
                    error: err.message || err,
                });
            }

           

            // Prepare the WebSocket broadcast message
            const broadcastMessage = JSON.stringify({
                event: "otherusercheckonline",
                users: results,
            });

            // Broadcast to all connected WebSocket clients
            if (wss && wss.clients) {
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(broadcastMessage);
                    }
                });
            }

            // Respond with results
            return res.status(200).json({ results });
        });
    } catch (error) {
        console.error("Server error:", error); // Log the error
        return res.status(500).json({ message: "Server error", error: error.message || error });
    }
};
exports.useractivity = async (req, res) => {
    const { user_id } = req.body; // User ID from the request body
    const wss = req.wss; // WebSocket server instance
  
    try {
      // Update the logged-in user's `last_activity` to the current time
      const updateLastActivityQuery = `
        UPDATE users 
        SET last_activity = NOW(), online_user = 'Online' 
        WHERE id = ?;
      `;
  
      db.query(updateLastActivityQuery, [user_id], (updateErr) => {
        if (updateErr) {
          console.error("Error updating user activity:", updateErr);
          return res.status(500).json({ message: "Database error", error: updateErr });
        }
  
        // Check for inactive users who are still marked as 'Online'
        const findInactiveUsersQuery = `
        SELECT id 
        FROM users 
        WHERE last_activity < NOW() - INTERVAL 20 SECOND AND online_user = 'Online' AND id != ?;
        `;

        db.query(findInactiveUsersQuery, [user_id], (err, results) => {
          if (err) {
            console.error("Error detecting offline users:", err);
            return res.status(500).json({ message: "Database error", error: err });
          }
  
          if (results.length === 0) {
            // No other users went inactive
            return res.status(200).json({ message: "Activity updated. No users became inactive." });
          }
  
          const inactiveUserIds = results.map((user) => user.id);
  
          // Update inactive users to 'Offline'
          const updateOfflineQuery = `
            UPDATE users 
            SET online_user = 'Offline' 
            WHERE id IN (?);
          `;
  
          db.query(updateOfflineQuery, [inactiveUserIds], (offlineErr) => {
            if (offlineErr) {
              console.error("Error updating offline users:", offlineErr);
              return res.status(500).json({ message: "Database error", error: offlineErr });
            }
  
            // Broadcast the offline status to all WebSocket clients
            const broadcastMessage = JSON.stringify({
              event: "Offline",
              users: inactiveUserIds,
            });
  
            if (wss && wss.clients) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcastMessage);
                }
              });
            }
  
            console.log(`Users marked offline: ${inactiveUserIds.join(", ")}`);
            return res.status(200).json({ message: "Activity updated.", offlineUsers: inactiveUserIds });
          });
        });
      });
    } catch (error) {
      console.error("Server error:", error);
      return res.status(500).json({ message: "Server error", error: error.message || error });
    }
  };
  
