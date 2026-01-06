import sql from '../db.js';

// Security whitelist to prevent SQL injection into dynamic table names
const ALLOWED_SECTIONS = [
  'features',
  'activities',
  'testimonials',
  'programs',
  'website_stats',
  'website_settings',
];

/**
 * GET /api/website
 * Fetches the entire state of the single-page website.
 */
export const getWebsiteContent = async (req, res, next) => {
  try {
    await sql.begin(async (client) => {
      const [features, activities, testimonials, programs, stats, settings] = await Promise.all([
        client`SELECT * FROM features`,
        client`SELECT * FROM activities`,
        client`SELECT * FROM testimonials ORDER BY is_active DESC`,
        client`SELECT * FROM programs ORDER BY order_index ASC`,
        client`SELECT * FROM website_stats ORDER BY order_index ASC`,
        client`SELECT * FROM website_settings LIMIT 1`,
      ]);

      res.status(200).json({
        data: {
          hero: settings[0] || {},
          features,
          activities,
          testimonials,
          programs,
          stats,
        },
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/website/:section/:id?
 * Updates any record in the website sections.
 */
export const updateWebsiteContent = async (req, res, next) => {
  const { section, id } = req.params;
  const updates = req.body;

  try {
    if (!ALLOWED_SECTIONS.includes(section)) {
      return res.status(400).json({ message: 'Invalid website section' });
    }

    let targetId = id;

    // Auto-detect ID for single-row settings if not provided
    if (section === 'website_settings' && !id) {
      const [existing] = await sql`SELECT id FROM website_settings LIMIT 1`;
      targetId = existing?.id;
    }

    if (!targetId) {
      return res.status(400).json({ message: 'Record ID is required' });
    }

    // Dynamic Update Builder (Matches your editTeacher logic)
    const columns = Object.keys(updates).filter((key) => updates[key] !== undefined);
    if (columns.length === 0) return res.status(400).json({ message: 'No updates provided' });

    const setClauses = columns.map((col, i) => `${col} = $${i + 1}`);
    const values = columns.map((col) => updates[col]);
    values.push(targetId);

    const query = `
      UPDATE ${section} 
      SET ${setClauses.join(', ')} 
      WHERE id = $${values.length} 
      RETURNING *`;

    const [result] = await sql.unsafe(query, values);

    if (!result) {
      return res.status(404).json({ message: 'Content record not found' });
    }

    res.status(200).json({
      message: `${section} updated successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
