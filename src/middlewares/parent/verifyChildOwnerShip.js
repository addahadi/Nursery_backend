// middlewares/parent/verifyChildOwnership.js
export const verifyChildOwnership = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const childId = req.params.childId || req.body.childId;

    if (!childId) {
      return res.status(400).json({ message: 'Child ID is required' });
    }

    const [child] = await sql`
      SELECT child_id FROM childs 
      WHERE child_id = ${childId} AND parent_id = ${parentId}
    `;

    if (!child) {
      // More explicit: this is an authorization issue, not a "not found" issue
      return res.status(403).json({
        message: "Access denied: You do not have permission to access this child's data",
      });
    }

    req.verified_child_id = childId;
    next();
  } catch (error) {
    next(error);
  }
};
