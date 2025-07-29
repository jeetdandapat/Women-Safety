const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: String,
  address: String,
  token: String, // session token saved here
  emergencyContacts: [emergencyContactSchema],
});

module.exports = mongoose.model("User", userSchema);
