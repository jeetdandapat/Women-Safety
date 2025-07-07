// ==========================
//  Import Required Modules
// ==========================

const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const axios = require("axios");

const port = 8080; // Server port

// ==========================
// Middleware Configuration
// ==========================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// ==========================
//  Routes
// ==========================

// Home
app.get("/", (req, res) => {
  res.render("Home");
});

// ++++++++++++++++ Women Routes ++++++++++++++++++
app.get("/WomenRegistration", (req, res) => {
  res.render("WomenRegistration");
});
app.get("/WomenLogin", (req, res) => {
  res.render("WomenLogin");
});
app.get("/WomenDashboard", (req, res) => {
  res.render("WomenDashboard");
});
app.get("/DeviseDeshboard", (req, res) => {
  res.render("DeviseDeshboard");
});

// ++++++++++++++++ Volunteer Routes ++++++++++++++++++
app.get("/Volunteer_Deshboard", (req, res) => {
  res.render("Volunteer_Deshboard");
});
app.get("/volunteer-login", (req, res) => {
  res.render("volunteer-login");
});
app.get("/volunteer-register", (req, res) => {
  res.render("volunteer-register");
});

// ++++++++++++++++ Police Routes ++++++++++++++++++
app.get("/pulish_registration", (req, res) => {
  res.render("pulish_registration");
});
app.get("/Police_login", (req, res) => {
  res.render("Police_login");
});
app.get("/pulishstation", (req, res) => {
  res.render("pulishstation");
});

app.get("/Adminlogin", (req, res) => {
  res.render("Adminlogin");
});
app.get("/Adminpanal", (req, res) => {
  res.render("Adminpanal");
});
// ==========================
// Send SMS Alert API (POST)
// ==========================

require('dotenv').config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/send-alert", async (req, res) => {
  const { to, subject, html } = req.body;

  try {
    const info = await transporter.sendMail({
      from: `"Safety Alert System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});




// ==========================
// Start Server
// ==========================

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
