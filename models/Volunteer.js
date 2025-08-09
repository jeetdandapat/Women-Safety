
const mongoose = require("mongoose");

const volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  password: { type: String, required: true },
  token: String, // session token if needed later
}, {
  timestamps: true
});

module.exports = mongoose.model("Volunteer", volunteerSchema);
