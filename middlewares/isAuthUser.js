module.exports = (req, res, next) => {
  console.log(req.session);
  console.log(req.user);
  if (!req.session.isLoggedIn) {
    return res.status(401).send({ message: "Access Denied!" });
  }
  next();
};
