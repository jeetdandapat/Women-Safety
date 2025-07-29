// ==========================
// Required Modules & Config
// ==========================
require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const nodemailer = require("nodemailer");
const session = require("express-session"); // Added session

// ==========================
// Basic Config
// ==========================
const port = 8080;

// ==========================
// Middleware Setup
// ==========================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

//  Setup session middleware here:
app.use(
  session({
    secret: process.env.SESSION_SECRET, // You can store this in .env if needed
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Use `true` if using HTTPS
  })
);

// ==========================
// MongoDB Connection
// ==========================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Failed:", err));

// ==========================
// Route Files
// ==========================
const womenRoutes = require("./routes/womenRoutes");
app.use("/", womenRoutes);

// ==========================
// Page Routes
// ==========================
app.get("/", (req, res) => res.render("Home"));
app.get("/WomenRegistration", (req, res) => res.render("WomenRegistration"));
app.get("/WomenLogin", (req, res) => res.render("WomenLogin"));
const User = require("./models/User"); // path ko apne project ke hisab se adjust karo
const { isAuthenticated, logout } = require("./middleware/auth");



app.get("/WomenDashboard", isAuthenticated, async (req, res) => {
  try {
    const email = req.session.user?.email;
    if (!email) return res.redirect("/WomenLogin");

    const user = await User.findOne({ email });
    if (!user) return res.redirect("/WomenLogin");

    res.render("WomenDashboard", { user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});




// GET /logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/WomenDashboard"); // fallback
    }
    res.clearCookie("connect.sid");
    res.redirect("/"); // Home page
  });
});



app.get("/DeviseDeshboard", isAuthenticated, (req, res) => {
  res.render("DeviseDeshboard", {
    user: req.session.user, // optional if your page uses it
  });
});

app.get("/Volunteer_Deshboard", (req, res) => res.render("Volunteer_Deshboard"));
app.get("/volunteer-login", (req, res) => res.render("volunteer-login"));
app.get("/volunteer-register", (req, res) => res.render("volunteer-register"));
app.get("/pulish_registration", (req, res) => res.render("pulish_registration"));
app.get("/Police_login", (req, res) => res.render("Police_login"));
app.get("/pulishstation", (req, res) => res.render("pulishstation"));
app.get("/Adminlogin", (req, res) => res.render("Adminlogin"));
app.get("/Adminpanal", (req, res) => res.render("Adminpanal"));

// ==========================
// Email Alert System
// ==========================
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

    console.log(" Email sent:", info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================
// Start Server
// ==========================
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
