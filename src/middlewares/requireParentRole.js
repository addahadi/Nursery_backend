export const requireParentRole = async (req, res, next) => {
  const userId = req.auth.userId;

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single();

  if (!user || user.role !== 'parent') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};
