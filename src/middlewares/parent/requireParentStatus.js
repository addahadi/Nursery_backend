export const requireParentStatus = (state) => {
  return async (req, res, next) => {
    try {
      const parent_id = req.user.id;
      const [{ status }] = await sql`
                SELECT status FROM parents WHERE parent_id = ${parent_id}
            `;
      if (status !== state) {
        return res.status(403).json({
          error: 'Access denied: Parent status must be ' + state,
        });
      }
      next();
    } catch (error) {
      console.error('requireParentStatus error:', err);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
};
