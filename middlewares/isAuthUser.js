module.exports = (req, res, next) => {
  console.log(req.session)
  if (!req.session.isLoggedIn) {
    return res.status(401).send({ message: "Access Denied!" });
  }
  next();
};
