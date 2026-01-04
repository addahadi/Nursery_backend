import jwt from 'jsonwebtoken'; // ← ADD THIS LINE!

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({
      error: 'No token provided',
    });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({
        error: 'Invalid token',
      });
    console.log('Authenticated user:', user); // ← ADD THIS LINE!
    req.user = user;
    next();
  });
};
