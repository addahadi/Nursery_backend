import sql from '../../db.js';

export const requireParent = ({ status } = {}) => {
  return async (req, res, next) => {
    try {
      // 1. Role check
      if (req.user.role !== 'parent') {
        return res.status(403).json({
          error: 'Access denied: Parents only',
        });
      }

      // 2. Status check (optional)
      if (status) {
        const parentId = req.user.id;

        const [parent] = await sql`
          SELECT status FROM parents WHERE parent_id = ${parentId}
        `;

        if (!parent || parent.status !== status) {
          return res.status(403).json({
            error: `Access denied: Parent status must be ${status}`,
          });
        }
      }

      next();
    } catch (err) {
      console.error('requireParent error:', err);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
};
