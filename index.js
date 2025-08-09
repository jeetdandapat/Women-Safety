require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const nodemailer = require("nodemailer");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const Volunteer = require("./models/Volunteer");
const User = require("./models/User");

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

// ==========================
// Session Middleware (MongoDB Store)
// ==========================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// ==========================
// Routes
// ==========================
const womenRoutes = require("./routes/womenRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");

app.use("/", womenRoutes);
app.use("/", volunteerRoutes);

// ==========================
// Page Routes
// ==========================
const { isAuthenticated } = require("./middleware/auth");

app.get("/", (req, res) => res.render("Home"));
app.get("/WomenRegistration", (req, res) => res.render("WomenRegistration"));
app.get("/WomenLogin", (req, res) => res.render("WomenLogin"));

app.get("/WomenDashboard", isAuthenticated, async (req, res) => {
  try {
    const email = req.session.user?.email;
    if (!email) return res.redirect("/WomenLogin");

    const user = await User.findOne({ email });
    if (!user) return res.redirect("/WomenLogin");

    const volunteers = await Volunteer.find();

    res.render("WomenDashboard", { user, volunteers });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/WomenDashboard");
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

app.get("/DeviseDeshboard", isAuthenticated, (req, res) => {
  res.render("DeviseDeshboard", { user: req.session.user });
});

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

    console.log("Email sent:", info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================
// MongoDB Connection & Start Server
// ==========================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(port, () => {
      console.log(`🚀 Server is running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
  });
