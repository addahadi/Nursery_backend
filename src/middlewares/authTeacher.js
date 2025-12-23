module.exports = (req, res, next) => {
  if (req.user.role !== 'TEACHER') {
    return res.status(403).json({ message: "you don't have the acces" });
  }
  next();
};
