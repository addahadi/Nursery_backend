export const requireParentRole = (req, res, next) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({
      error: 'Access denied: Parents only',
    });
  }
  next();
};
