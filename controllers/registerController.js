const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const moment = require("moment-timezone");

exports.register = async (req, res) => {
  const {
    question,
    answer,
    username,
    email,
    password,
    birth_date,
    birth_month,
    birth_year,
    profile_type,
    preferences,
    gender,
  } = req.body;
  console.log(req.body);

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Additional validation if needed
  if (
    !username ||
    !email ||
    !password ||
    !birth_date ||
    !birth_month ||
    !birth_year ||
    !profile_type ||
    !preferences ||
    !gender
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if username and email are the same
  if (username.toLowerCase() === email.toLowerCase()) {
    return res
      .status(400)
      .json({ message: "Username cannot be the same as email" });
  }

  try {
    const slug = await createUniqueSlug(username);

    // Check if email or username already exists
    db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username],
      async (err, rows) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        let errorMessage = null;

        // Separate checks for email and username
        if (rows.some((row) => row.email === email)) {
          errorMessage = "Email already registered";
        }

        if (rows.some((row) => row.username === username)) {
          errorMessage = errorMessage
            ? errorMessage + " and username already registered"
            : "Username already registered";
        }

        if (errorMessage) {
          return res.status(400).json({ message: errorMessage });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create the birthdate string and format it using moment.js
        const dobb = `${birth_date}-${birth_month}-${birth_year}`;
        const dob = moment
          .tz(new Date(dobb), "Europe/Oslo")
          .format("YYYY-MM-DD HH:mm:ss");
        const date = moment
          .tz(new Date(), "Europe/Oslo")
          .format("YYYY-MM-DD HH:mm:ss");
        // Insert new user into the database
        const profileImageUrl = req.file?.location; // Access directly from req.file

        const query = `
          INSERT INTO users (profile_image,security_question,security_answer,viewpassword, slug, username, email, password, birthday_date, profile_type, preferences, gender,created_at) 
          VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`;

        db.query(
          query,
          [
            profileImageUrl,
            question,
            answer,
            password,
            slug,
            username,
            email,
            hashedPassword,
            dob,
            profile_type,
            preferences,
            gender,
            date,
          ],
          (err, result) => {
            if (err) {
              console.error("Error inserting user:", err);
              return res
                .status(500)
                .json({ message: "Database insertion error", error: err });
            }

            // res.status(201).json({
            //   message: "User registered successfully",
            //   userId: result.insertId,
            // });
            const start_date = moment
              .tz(new Date(), "Europe/Oslo")
              .format("YYYY-MM-DD HH:mm:ss");
            const end_date = moment
              .tz(new Date(), "Europe/Oslo")
              .add(14, "days")
              .format("YYYY-MM-DD HH:mm:ss");
            const query = `
          INSERT INTO membership (user_id,start_date,end_date,days,plan) 
          VALUES (?, ?, ?, ?,?)`;

            db.query(
              query,
              [result.insertId, start_date, end_date, 14, "Free"],
              (err, result) => {
                if (err) {
                  console.error("Error inserting user:", err);
                  return res
                    .status(500)
                    .json({ message: "Database insertion error", error: err });
                }

                const query = `
          INSERT INTO allmembership (user_id,start_date,end_date,days,plan) 
          VALUES (?, ?, ?, ?,?)`;

                db.query(
                  query,
                  [result.insertId, start_date, end_date, 14, "Free"],
                  (err, result) => {
                    if (err) {
                      console.error("Error inserting user:", err);
                      return res.status(500).json({
                        message: "Database insertion error",
                        error: err,
                      });
                    }

                    res.status(201).json({
                      message: "User registered successfully",
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Registration error", error });
  }
};

exports.updateProfile = async (req, res) => {
  const {
    male,
    female,
    couple,
    interstedin,
    connectwith,
    genders,
    makeImagePrivate,
    token,
    email,
    looking_for,
    username,
    location,
    town,
    preferences_text,
    nationality,
    bodytype,
    height_feet,
    height_inches,
    sexual_orientation,
    relationship_status,
    search_looking_for,
    degree,
    drinker,
    smoker,
    tattos,
    body_piercings,
    fetish,
    fileType,
  } = req.body;

  // Fetch existing user data from the database
  db.query(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database fetch error", error: err });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate the slug from username
      const slug = await createUniqueSlug(username);

      const maleValues = Array.isArray(male) ? JSON.stringify(male) : null;
      const femaleValues = Array.isArray(female)
        ? JSON.stringify(female)
        : null;
      const coupleValues = Array.isArray(couple)
        ? JSON.stringify(couple)
        : null;

      // Get existing values
      const existingUser = result[0];
      const profileImageUrl =
        req.files["profile_image"]?.[0]?.location || existingUser.profile_image;
      const profileImages1 =
        req.files["profile_image_1"]?.[0]?.location ||
        existingUser.profile_image_1;
      const profileImages2 =
        req.files["profile_image_2"]?.[0]?.location ||
        existingUser.profile_image_2;
      const profileImages3 =
        req.files["profile_image_3"]?.[0]?.location ||
        existingUser.profile_image_3;
      const profileImages4 =
        req.files["profile_image_4"]?.[0]?.location ||
        existingUser.profile_image_4;

      try {
        if (!email) {
          return res
            .status(400)
            .json({ message: "Email is required to update profile" });
        }

        // Check if username is being changed and if the new username is available
        if (username !== existingUser.username) {
          // Ensure username is not the same as email
          if (username.toLowerCase() === email.toLowerCase()) {
            return res
              .status(400)
              .json({ message: "Username cannot be the same as email" });
          }

          // Check if the new username already exists
          db.query(
            "SELECT * FROM users WHERE username = ?",
            [username],
            (err, rows) => {
              if (err) {
                return res
                  .status(500)
                  .json({ message: "Database query error", error: err });
              }

              if (rows.length > 0) {
                return res
                  .status(400)
                  .json({ message: "Username already exists" });
              }

              // Proceed with updating the profile if username is unique
              updateUserProfile();
            }
          );
        } else {
          // If username is not changed, proceed to update the profile
          updateUserProfile();
        }

        function updateUserProfile() {
          // Update user in the database
          db.query(
            `UPDATE users SET 
              male=?, female=?, couple=?, interstedin=?, connectwith=?, genders=?, makeImagePrivate=?,
              profile_image_1=?, profile_image_2=?, profile_image_3=?, profile_image_4=?,
              looking_for=?, username=?, location=?,town=?, preferences_text=?, nationality=?,
              bodytype=?, height_feet=?, height_inches=?, sexual_orientation=?, relationship_status=?,
              search_looking_for=?, degree=?, drinker=?, smoker=?, tattos=?, body_piercings=?, fetish=?,
              profile_image=?, slug=?
              WHERE email=?`,
            [
              maleValues,
              femaleValues,
              coupleValues,
              interstedin,
              connectwith,
              genders,
              makeImagePrivate,
              profileImages1,
              profileImages2,
              profileImages3,
              profileImages4,
              looking_for,
              username,
              location,
              town,
              preferences_text,
              nationality,
              bodytype,
              height_feet,
              height_inches,
              sexual_orientation,
              relationship_status,
              search_looking_for,
              degree,
              drinker,
              smoker,
              tattos,
              body_piercings,
              fetish,
              profileImageUrl,
              slug,
              email,
            ],
            (err, result) => {
              if (err) {
                return res
                  .status(500)
                  .json({ message: "Database update error", error: err });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ message: "User not found" });
              }

              res
                .status(200)
                .json({ message: "User profile updated successfully" });
            }
          );
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    }
  );
};

// Function to generate a slug from username
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/--+/g, "-"); // Replace multiple hyphens with a single one
}

// Function to create a unique slug
function createUniqueSlug(title) {
  return new Promise((resolve, reject) => {
    const slug = generateSlug(title);

    // Check if the slug already exists
    db.query(
      "SELECT COUNT(*) as count FROM users WHERE slug = ?",
      [slug],
      (err, rows) => {
        if (err) {
          return reject(err); // Handle the error
        }

        // If the slug exists, add a number to the end and check again
        if (rows[0].count > 0) {
          let i = 1;
          const checkSlug = () => {
            const newSlug = `${slug}-${i}`;
            db.query(
              "SELECT COUNT(*) as count FROM users WHERE slug = ?",
              [newSlug],
              (err, newRows) => {
                if (err) {
                  return reject(err); // Handle the error
                }
                if (newRows[0].count === 0) {
                  return resolve(newSlug); // Return the new unique slug
                }
                i++;
                checkSlug(); // Check again with the incremented slug
              }
            );
          };
          checkSlug(); // Start checking with the incremented slug
        } else {
          resolve(slug); // Return the original slug if it's unique
        }
      }
    );
  });
}

exports.getProfile = async (req, res) => {
  const { email } = req.body;

  try {
    // Ensure the email is provided
    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required to get profile" });
    }

    // Query the database to get the user's profile details
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }

      // Check if the user exists
      if (rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send the user profile data as the response
      const userProfile = rows[0]; // Assuming you want the first row
      res.status(200).json(userProfile);
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getUserDetail = async (req, res) => {
  const { id } = req.body;

  try {
    // Ensure the email is provided
    if (!id) {
      return res.status(400).json({ message: "Id is required to get profile" });
    }

    // Query the database to get the user's profile details
    db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }

      // Check if the user exists
      if (rows.length === 0) {
        return res.status(200).json({ result: "" });
      }

      // Send the user profile data as the response
      const userProfile = rows[0]; // Assuming you want the first row
      res.status(200).json({ result: userProfile });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getRequestDetails = async (req, res) => {
  const { user_id } = req.body;

  try {
    // Ensure the user ID is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
          up.*, 
          u.username, 
          u.location, 
          u.birthday_date, 
          u.profile_image 
      FROM 
          userphotoPrivate up
      JOIN 
          users u ON u.id = up.user_id
      WHERE 
          up.to_id = ? 
      ORDER BY 
          up.id DESC;
`,
      [user_id],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // Check if user data is found

        // Send the user profile data as the response
        const userProfile = results; // Assuming you want the first row
        res.status(200).json(userProfile);
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getUserDetailsetting = async (req, res) => {
  const { id } = req.body;

  try {
    // Ensure the email is provided
    if (!id) {
      return res.status(400).json({ message: "Id is required to get profile" });
    }

    // Query the database to get the user's profile details
    db.query(
      "SELECT users.*,membership.user_id,membership.start_date,membership.end_date,membership.days,membership.plan FROM users JOIN membership ON membership.user_id = users.id WHERE users.id = ?",
      [id],
      (err, rows) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // Check if the user exists
        if (rows.length === 0) {
          return res.status(200).json({ result: "" });
        }

        // Send the user profile data as the response
        const userProfile = rows[0]; // Assuming you want the first row
        res.status(200).json({ result: userProfile });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


exports.paymentsave = async(req, res) => {
  const { user_id, name,days,amount, card_number, month_year } = req.body; // Expecting user_id and to_id from the request body
  console.log(req.body);
  try {
    const start_date = moment
    .tz(new Date(), "Europe/Oslo")
    .format("YYYY-MM-DD HH:mm:ss");
    const end_date = moment
    .tz(new Date(), "Europe/Oslo")
    .add(days, "days")
    .format("YYYY-MM-DD HH:mm:ss");
      db.query(
          "UPDATE membership SET start_date = ?,end_date=?,days=?,plan=? WHERE user_id = ?", [start_date, end_date,],
          (err) => {
              if (err) {
                  console.error("Database update error:", err); // Log error to console
                  return res
                      .status(500)
                      .json({ message: "Database update error", error: err });
              }

          }
      );
  } catch (error) {
      return res.status(500).json({ message: "Server error", error });
  }
};