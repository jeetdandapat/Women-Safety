// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next(); // allow access
  } else {
    return res.redirect("/WomenLogin"); // redirect to login if not authenticated
  }
}

// Logout controller function
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/WomenDashboard"); // fallback
    }
    res.clearCookie("connect.sid");
    res.redirect("/"); //  home route par redirect karega
  });
}


module.exports = {
  isAuthenticated,
  logout,
};
