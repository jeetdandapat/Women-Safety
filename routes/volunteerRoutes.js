const express = require("express");
const router = express.Router();
const Volunteer = require("../models/Volunteer");
const bcrypt = require("bcrypt");

// ========== GET Routes ==========

// Volunteer Registration Page
router.get("/volunteer-register", (req, res) => {
  res.render("volunteer-register");
});

// Volunteer Login Page
router.get("/volunteer-login", (req, res) => {
  res.render("volunteer-login");
});

// Volunteer Dashboard (Protected)
router.get("/Volunteer_Deshboard", isVolunteerAuthenticated, (req, res) => {
  res.render("Volunteer_Deshboard", { volunteer: req.session.volunteer });
});

// Volunteer Logout
router.get("/volunteer-logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Logout failed.");
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// ========== POST Routes ==========

// Volunteer Registration Handler
router.post("/volunteer-register", async (req, res) => {
  const { name, email, phone, location, password } = req.body;

  // Input validation
  if (!name || !email || !phone || !location || !password) {
    return res.status(400).send("❌ All fields are required.");
  }

  try {
    const existing = await Volunteer.findOne({ email });
    if (existing) {
      return res.status(400).send("⚠️ Volunteer already registered with this email.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newVolunteer = new Volunteer({
      name,
      email,
      phone,
      location,
      password: hashedPassword,
    });

    await newVolunteer.save();

    console.log(`✅ New volunteer registered: ${email}`);
    res.redirect("/volunteer-login");
  } catch (err) {
    console.error("❌ Registration Error:", err.message);
    res.status(500).send("Registration failed due to server error.");
  }
});

// Volunteer Login Handler
router.post("/volunteer-login", async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).send("❌ Email and password are required.");
  }

  try {
    const volunteer = await Volunteer.findOne({ email });
    if (!volunteer) {
      return res.status(400).send("❌ No account found with this email.");
    }

    const isMatch = await bcrypt.compare(password, volunteer.password);
    if (!isMatch) {
      return res.status(401).send("❌ Incorrect password.");
    }

    // Store basic info in session
   req.session.volunteer = {
  _id: volunteer._id,
  name: volunteer.name,
  email: volunteer.email,
  phone: volunteer.phone,
};


    console.log(`✅ Volunteer logged in: ${email}`);
    res.redirect("/Volunteer_Deshboard");
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    res.status(500).send("Login failed due to server error.");
  }
});

// ========== Middleware ==========

// Protect dashboard route
function isVolunteerAuthenticated(req, res, next) {
  if (req.session && req.session.volunteer) {
    return next();
  }
  return res.redirect("/volunteer-login");
}

module.exports = router;
