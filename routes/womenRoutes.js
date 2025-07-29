const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

//  Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, gender, address } = req.body;

    if (password !== confirmPassword) {
      return res.send(" Passwords do not match");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send(" Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const token = crypto.randomBytes(32).toString("hex");

    const user = new User({
      name,
      email,
      password: hashedPassword,
      gender,
      address,
      token,
    });

    await user.save();

    res.redirect("/WomenLogin");
  } catch (err) {
    res.status(500).send(" Registration failed: " + err.message);
  }
});

//  Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.send("Invalid credentials");
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");

  //  Update token in DB (optional but recommended)
  user.token = sessionToken;
  await user.save();

  //  Set session data
  req.session.token = sessionToken;
  req.session.user = {
    name: user.name,
    email: user.email,
    initial: user.name.charAt(0).toUpperCase(),
  };

  res.redirect("/WomenDashboard");
});

//  Emergency Contact Route
router.post("/dashboard/add-contact", async (req, res) => {
  try {
    const { email, contactName, contactEmail, contactPhone } = req.body;

    if (!email || !contactName || !contactEmail || !contactPhone) {
      return res.status(400).send("All fields are required.");
    }

    const user = await User.findOneAndUpdate(
      { email },
      {
        $push: {
          emergencyContacts: {
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
          },
        },
      },
      { new: true } // returns updated document
    );

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.redirect("/WomenDashboard");
  } catch (error) {
    console.error("Error adding contact:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
